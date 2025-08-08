import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import { getServerSession } from "next-auth/next"
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { join } from 'path'

const execAsync = promisify(exec)

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const arIoNodePath = process.env.AR_IO_NODE_PATH || '/tmp/ar-io-node'
    const backupDir = join(arIoNodePath, 'backups')
    const timestamp = new Date().toISOString().replace(/[:.-]/g, '_')
    const backupFileName = `config_backup_${timestamp}.tar.gz`
    const backupFilePath = join(backupDir, backupFileName)

    // Create backup directory if it doesn't exist
    await execAsync(`mkdir -p ${backupDir}`)

    // Create a tar.gz archive of all .env files in the ar-io-node path
    // This command assumes .env files are directly in AR_IO_NODE_PATH
    const command = `tar -czf ${backupFilePath} -C ${arIoNodePath} $(find ${arIoNodePath} -maxdepth 1 -name "*.env*" -printf "%f ")`
    
    await execAsync(command)

    return NextResponse.json({ success: true, message: `Configuration backed up to ${backupFilePath}` })
  } catch (error) {
    console.error('Error backing up configuration:', error)
    return NextResponse.json({ error: 'Failed to backup configuration' }, { status: 500 })
  }
}
