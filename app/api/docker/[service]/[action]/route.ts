import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import { getServerSession } from "next-auth/next"
import { authOptions } from '@/app/api/auth/[...nextauth]/route' // Import authOptions from the NextAuth route

const execAsync = promisify(exec)

export async function POST(
  request: NextRequest,
  { params }: { params: { service: string; action: string } }
) {
  const session = await getServerSession(authOptions) // Pass authOptions to getServerSession
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { service, action } = params
    
    // First try to find the container using docker compose
    const { stdout: composeOutput } = await execAsync(`docker compose -p ar-io-node ps ${service} --format "{{.Name}}" 2>/dev/null || echo ""`)
    let containerName = composeOutput.trim()

    // If not found via compose, try the manual mapping
    if (!containerName) {
      const containerMap: Record<string, string> = {
        'gateway': 'ar-io-node-core-1',
        'observer': 'ar-io-node-observer-1',
        'envoy': 'ar-io-node-envoy-1',
        'autoheal': 'ar-io-node-autoheal-1',
        'clickhouse': 'ar-io-node-clickhouse-1',
        'litestream': 'ar-io-node-litestream-1',
        'grafana': 'ar-io-node-grafana-1',
        'ao-cu': 'ar-io-node-ao-cu-1',
        'bundler': 'ar-io-node-upload-service-1',
        'admin': 'ar-io-node-admin-1'
      }
      containerName = containerMap[service] || `ar-io-node-${service}-1`
    }

    let command = ''
    switch (action) {
      case 'start':
        command = `docker compose -p ar-io-node start ${service} 2>/dev/null || docker start ${containerName}`
        break
      case 'stop':
        command = `docker stop ${containerName}`
        break
      case 'restart':
        command = `docker restart ${containerName}`
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const { stdout } = await execAsync(command)
    return NextResponse.json({ success: true, output: stdout })
  } catch (error) {
    console.error(`Error executing ${params.action} on ${params.service}:`, error)
    return NextResponse.json({ error: 'Action failed' }, { status: 500 })
  }
}
