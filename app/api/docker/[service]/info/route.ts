import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import { getServerSession } from "next-auth/next"
import { authOptions } from '@/app/api/auth/[...nextauth]/route' // Import authOptions from the NextAuth route

const execAsync = promisify(exec)

export async function GET(
  request: NextRequest,
  { params }: { params: { service: string } }
) {
  const session = await getServerSession(authOptions) // Pass authOptions to getServerSession
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const service = params.service
    
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
        'admin': 'ar-io-node-admin-dashboard-1'
      }
      containerName = containerMap[service] || `ar-io-node-${service}-1`
    }

    // Get container status
    const { stdout: statusOutput } = await execAsync(`docker ps -a --filter "name=${containerName}" --format "{{.Status}}" 2>/dev/null || echo "not found"`)
    const status = statusOutput.includes('Up') ? 'running' : statusOutput.includes('Exited') ? 'stopped' : 'unknown'

    // Get container ports
    const { stdout: portsOutput } = await execAsync(`docker port ${containerName} 2>/dev/null || echo ""`)
    const ports = portsOutput.trim().split('\n').filter(Boolean)

    // Get container image version
    const { stdout: versionOutput } = await execAsync(`docker inspect ${containerName} --format "{{.Config.Image}}" 2>/dev/null || echo "unknown"`)
    const version = versionOutput.trim()

    // Get uptime
    const { stdout: uptimeOutput } = await execAsync(`docker inspect ${containerName} --format "{{.State.StartedAt}}" 2>/dev/null || echo ""`)
    const startedAt = uptimeOutput.trim()
    
    // Calculate uptime
    let uptime = 'Unknown'
    if (startedAt && startedAt !== 'unknown') {
      const startTime = new Date(startedAt)
      const now = new Date()
      const diffMs = now.getTime() - startTime.getTime()
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
      const diffDays = Math.floor(diffHours / 24)
      
      if (diffDays > 0) {
        uptime = `${diffDays}d ${diffHours % 24}h`
      } else {
        uptime = `${diffHours}h`
      }
    }

    // Get health status
    const { stdout: healthOutput } = await execAsync(`docker inspect ${containerName} --format "{{.State.Health.Status}}" 2>/dev/null || echo "none"`)
    const health = healthOutput.trim() === 'healthy' ? 'healthy' : status === 'running' ? 'running' : 'unhealthy'

    return NextResponse.json({
      status,
      ports,
      version,
      health,
      uptime,
      lastRestart: startedAt
    })
  } catch (error) {
    console.error('Error fetching docker info:', error)
    return NextResponse.json({
      status: 'unknown',
      ports: [],
      version: 'unknown',
      health: 'unknown',
      uptime: 'unknown',
      lastRestart: 'unknown'
    })
  }
}
