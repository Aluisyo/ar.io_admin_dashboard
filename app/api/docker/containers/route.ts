import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import { getServerSession } from "next-auth/next"
import { authOptions } from '@/app/api/auth/[...nextauth]/route' // Import authOptions from the NextAuth route

const execAsync = promisify(exec)

// Only show these specific services from the original requirements
const ALLOWED_SERVICES = [
  'gateway', // maps to ar-io-node-core-1
  'observer', 
  'envoy',
  'autoheal',
  'clickhouse',
  'litestream', // no direct container, will be mocked or removed
  'grafana',
  'ao-cu',
  'bundler', // maps to ar-io-node-upload-service-1
  'admin' // no direct container, will be mocked or removed
]

export async function GET() {
  try {
    const session = await getServerSession(authOptions) // Pass authOptions to getServerSession
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use docker compose to get containers for the ar-io-node project
    const { stdout } = await execAsync(`docker compose -p ar-io-node ps --format "{{.Name}},{{.Status}},{{.Ports}},{{.CreatedAt}}" 2>/dev/null || echo ""`)
    
    if (!stdout.trim()) {
      // Fallback to docker ps with project filter if docker compose ps fails
      const { stdout: fallbackOutput } = await execAsync(`docker ps -a --filter "label=com.docker.compose.project=ar-io-node" --format "{{.Names}},{{.Status}},{{.Ports}},{{.CreatedAt}}" 2>/dev/null || echo ""`)
      
      if (!fallbackOutput.trim()) {
        return NextResponse.json([])
      }
      
      return parseContainers(fallbackOutput)
    }
    
    return parseContainers(stdout)
  } catch (error) {
    console.error('Error fetching containers:', error)
    return NextResponse.json([])
  }
}

function parseContainers(stdout: string) {
  const containers = stdout.trim().split('\n').filter(Boolean).map(line => {
    const [name, status, ports, createdAt] = line.split(',')
    
    // Extract service name from container name
    let serviceId = name.replace('ar-io-node-', '').replace(/-\d+$/, '').replace(/-1$/, '')
    
    // Map specific container names to our service IDs
    if (name.includes('core')) serviceId = 'gateway'
    if (name.includes('upload-service')) serviceId = 'bundler' // Assuming bundler maps to upload-service
    
    // Only include allowed services
    if (!ALLOWED_SERVICES.includes(serviceId)) {
      return null
    }
    
    // Parse status
    const isRunning = status.includes('Up')
    const uptime = isRunning ? status.match(/Up (.+?)(?:\s|$)/)?.[1] || 'Unknown' : '0h'
    
    // Parse ports
    const portList = ports ? ports.split(',').map(p => p.trim()).filter(Boolean) : []
    
    return {
      name: formatServiceName(serviceId),
      container: name,
      serviceId: serviceId, // Include serviceId here
      status: isRunning ? 'running' : 'stopped',
      uptime,
      cpu: Math.floor(Math.random() * 50) + 10, // Mock data for now
      memory: Math.floor(Math.random() * 60) + 20, // Mock data for now
      ports: portList
    }
  }).filter(Boolean)

  return NextResponse.json(containers)
}

function formatServiceName(serviceId: string): string {
  const nameMap: Record<string, string> = {
    'gateway': 'Gateway',
    'observer': 'Observer',
    'envoy': 'Envoy',
    'autoheal': 'Autoheal',
    'clickhouse': 'Clickhouse',
    'litestream': 'Litestream',
    'grafana': 'Grafana',
    'ao-cu': 'AO CU',
    'bundler': 'Bundler Turbo Service',
    'admin': 'Admin Dashboard'
  }
  
  return nameMap[serviceId] || serviceId.charAt(0).toUpperCase() + serviceId.slice(1)
}
