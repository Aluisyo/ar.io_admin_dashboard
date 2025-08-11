import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import { getServerSession } from "next-auth/next"
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import { access, constants } from 'fs/promises'

const execAsync = promisify(exec)

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const arIoNodePath = process.env.AR_IO_NODE_PATH || '/tmp/ar-io-node'
    const timestamp = new Date().toISOString().replace(/[:.-]/g, '_')
    const backupFileName = `config_backup_${timestamp}.tar.gz`
    
    // Use a writable directory for backups (user's home directory or /tmp)
    const userBackupDir = join(process.env.HOME || '/tmp', 'ar-io-backups')
    const backupFilePath = join(userBackupDir, backupFileName)

    // Create backup directory with proper permissions
    if (!existsSync(userBackupDir)) {
      mkdirSync(userBackupDir, { recursive: true, mode: 0o755 })
    }

    // Verify we can write to the backup directory
    try {
      await access(userBackupDir, constants.W_OK)
    } catch (permError) {
      console.error('Cannot write to backup directory:', permError)
      return NextResponse.json({ error: 'Cannot access backup directory' }, { status: 500 })
    }

    // Find all .env files
    const findCommand = `find "${arIoNodePath}" -maxdepth 1 -name "*.env*" -type f`
    const { stdout: envFiles } = await execAsync(findCommand)
    
    if (!envFiles.trim()) {
      return NextResponse.json({ error: 'No .env files found to backup' }, { status: 404 })
    }

    // Create the backup with better error handling
    const envFilesList = envFiles.trim().split('\n').map(f => f.trim()).filter(f => f)
    console.log('Backing up files:', envFilesList)
    
    // Use a more robust tar command
    const tarCommand = `tar -czf "${backupFilePath}" -C "${arIoNodePath}" ${envFilesList.map(f => `"${f.replace(arIoNodePath + '/', '')}"`).join(' ')}`
    
    await execAsync(tarCommand)

    // Verify the backup was created
    if (!existsSync(backupFilePath)) {
      throw new Error('Backup file was not created')
    }

    // Get backup file size for confirmation
    const { stdout: sizeOutput } = await execAsync(`ls -lh "${backupFilePath}" | awk '{print $5}'`)
    const fileSize = sizeOutput.trim()

    return NextResponse.json({ 
      success: true, 
      message: `Configuration backed up successfully`,
      details: {
        backupPath: backupFilePath,
        fileSize: fileSize,
        filesBackedUp: envFilesList.length,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Error backing up configuration:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return NextResponse.json({ 
      error: 'Failed to backup configuration', 
      details: errorMessage 
    }, { status: 500 })
  }
}
