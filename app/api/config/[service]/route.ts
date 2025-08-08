import { NextRequest, NextResponse } from 'next/server'
import { join } from 'path'
import { getServerSession } from "next-auth/next"
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { readEnvFile, updateEnvFile } from '@/lib/env-utils' // Import env-utils

const AR_IO_NODE_PATH = process.env.AR_IO_NODE_PATH || '/tmp/ar-io-node'; // Use env var

export async function GET(
  request: NextRequest,
  { params }: { params: { service: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const configFile = searchParams.get('file') || '.env'
    const filePath = join(AR_IO_NODE_PATH, configFile) // Use AR_IO_NODE_PATH

    const envVars = await readEnvFile(filePath) // Read as key-value pairs
    return NextResponse.json(envVars) // Return as JSON
  } catch (error) {
    console.error('Error reading config file:', error)
    return NextResponse.json({}, { // Return empty object on error
      status: 500,
    })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { service: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const configFile = searchParams.get('file') || '.env'
    const filePath = join(AR_IO_NODE_PATH, configFile) // Use AR_IO_NODE_PATH

    const updates: Record<string, string> = await request.json() // Expect JSON body with updates
    await updateEnvFile(filePath, updates) // Update the file

    return NextResponse.json({ success: true, message: 'Configuration saved successfully!' })
  } catch (error) {
    console.error('Error writing config file:', error)
    return NextResponse.json({ error: 'Failed to save configuration' }, { status: 500 })
  }
}
