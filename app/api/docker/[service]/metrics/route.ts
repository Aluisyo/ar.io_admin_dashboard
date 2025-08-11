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
    
    // Detect container name via docker ps filter
    let containerName = '';
    try {
      const { stdout: psOutput } = await execAsync(`docker ps --filter "name=${service}" --format "{{.Names}}" 2>/dev/null || echo ""`);
      containerName = psOutput.split('\n')[0].trim();
    } catch {
      containerName = '';
    }
    // If not found via docker ps, try docker compose ps without explicit project
    if (!containerName) {
      const { stdout: composeOutput } = await execAsync(`docker compose ps ${service} --format "{{.Name}}" 2>/dev/null || echo ""`);
      containerName = composeOutput.trim();
    }

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

    // Get container stats
    const { stdout: statsOutput } = await execAsync(`docker stats ${containerName} --no-stream --format "{{.CPUPerc}},{{.MemPerc}},{{.NetIO}}" 2>/dev/null || echo "0%,0%,0B / 0B"`)
    const [cpuPerc, memPerc, netIO] = statsOutput.trim().split(',')

    const cpu = parseFloat(cpuPerc.replace('%', '')) || 0
    const memory = parseFloat(memPerc.replace('%', '')) || 0
    const [networkIn, networkOut] = netIO.split(' / ')

    return NextResponse.json({
      cpu: Math.round(cpu),
      memory: Math.round(memory),
      storage: Math.round(Math.random() * 100), // Placeholder for storage
      networkIn: networkIn?.trim() || '0B',
      networkOut: networkOut?.trim() || '0B'
    })
  } catch (error) {
    console.error('Error fetching container metrics:', error)
    return NextResponse.json({
      cpu: 0,
      memory: 0,
      storage: 0,
      networkIn: '0B',
      networkOut: '0B'
    })
  }
}
