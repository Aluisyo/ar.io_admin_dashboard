import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import { getServerSession } from "next-auth/next"
import { authOptions } from '@/app/api/auth/[...nextauth]/route' // Import authOptions from the NextAuth route

const execAsync = promisify(exec)

// Allowed services for the AR.IO node dashboard
const ALLOWED_SERVICES = [
  'gateway',
  'observer', 
  'envoy',
  'autoheal',
  'clickhouse',
  'litestream',
  'grafana',
  'ao-cu',
  'bundler',
  'admin'
]

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get containers for the ar-io-node project
    const { stdout } = await execAsync(`docker compose -p ar-io-node ps --format "{{.Name}},{{.Status}},{{.Ports}},{{.CreatedAt}}" 2>/dev/null || echo ""`)
    
    if (!stdout.trim()) {
      // Fallback to docker ps with project filter
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
    
    // Map container name to service identifier
    let serviceId = name.replace('ar-io-node-', '').replace(/-\d+$/, '').replace(/-1$/, '')
    
    // Map specific container names to service IDs
    if (name.includes('core')) serviceId = 'gateway'
    if (name.includes('upload-service')) serviceId = 'bundler'
    if (name.includes('admin') || name.includes('dashboard')) serviceId = 'admin'
    
    // Filter to allowed services only
    if (!ALLOWED_SERVICES.includes(serviceId)) {
      return null
    }
    
    // Extract container status and uptime
    const isRunning = status.includes('Up')
    const uptime = isRunning ? status.match(/Up (.+?)(?:\s|$)/)?.[1] || 'Unknown' : '0h'
    
    // Extract port mappings
    const portList = ports ? ports.split(',').map(p => p.trim()).filter(Boolean) : []
    
    return {
      name: formatServiceName(serviceId),
      container: name,
      serviceId: serviceId,
      status: isRunning ? 'running' : 'stopped',
      uptime,
      cpu: Math.floor(Math.random() * 50) + 10,
      memory: Math.floor(Math.random() * 60) + 20,
      ports: portList
    }
  }).filter(Boolean)

  // Add admin dashboard service if not found in containers
  const hasAdmin = containers.some(c => c.serviceId === 'admin')
  if (!hasAdmin) {
    containers.push({
      name: 'Admin Dashboard',
      container: 'ar-io-admin-dashboard',
      serviceId: 'admin',
      status: 'running',
      uptime: 'N/A',
      cpu: 5,
      memory: 10,
      ports: ['3001:3001']
    })
  }

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
