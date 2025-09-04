import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import { getServerSession } from "next-auth/next"
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import { access, constants } from 'fs/promises'
import { homedir } from 'os'

const execAsync = promisify(exec)

function expandPath(path: string): string {
  if (path.startsWith('~/') || path === '~') {
    return path.replace(/^~(?=$|\/|\\)/, homedir())
  }
  return path
}

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const arIoNodePath = expandPath(process.env.AR_IO_NODE_PATH || '~/ar-io-node')
    const timestamp = new Date().toISOString().replace(/[:.-]/g, '_')
    const backupFileName = `config_backup_${timestamp}.tar.gz`
    
    // Try multiple backup directory options
    const possibleDirs = [
      join(process.env.HOME || '/tmp', 'ar-io-backups'),
      join('/tmp', 'ar-io-backups'),
      join(arIoNodePath, 'backups')
    ]
    
    let userBackupDir = ''
    let backupFilePath = ''
    
    for (const dir of possibleDirs) {
      try {
        if (!existsSync(dir)) {
          mkdirSync(dir, { recursive: true, mode: 0o755 })
        }
        await access(dir, constants.W_OK)
        userBackupDir = dir
        backupFilePath = join(dir, backupFileName)
        console.log(`Using backup directory: ${dir}`)
        break
      } catch (permError) {
        console.warn(`Cannot access backup directory ${dir}:`, permError.message)
        continue
      }
    }
    
    if (!userBackupDir) {
      return NextResponse.json({ 
        error: 'Cannot access any backup directory. Please check file permissions.',
        details: `Tried: ${possibleDirs.join(', ')}`
      }, { status: 500 })
    }

    const findCommand = `find "${arIoNodePath}" -maxdepth 1 -name "*.env*" -type f`
    const { stdout: envFiles } = await execAsync(findCommand)
    
    if (!envFiles.trim()) {
      return NextResponse.json({ error: 'No .env files found to backup' }, { status: 404 })
    }

    const envFilesList = envFiles.trim().split('\n').map(f => f.trim()).filter(f => f)
    console.log('Backing up files:', envFilesList)
    
    const tarCommand = `tar -czf "${backupFilePath}" -C "${arIoNodePath}" ${envFilesList.map(f => `"${f.replace(arIoNodePath + '/', '')}"`).join(' ')}`
    
    await execAsync(tarCommand)

    if (!existsSync(backupFilePath)) {
      throw new Error('Backup file was not created')
    }

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
