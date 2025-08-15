import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import { getServerSession } from "next-auth/next"
import { authOptions } from '@/app/api/auth/[...nextauth]/route' // Import authOptions from the NextAuth route
import { getNotificationsFromFile, saveNotificationsToFile } from '@/lib/notification-store'

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
    
    // Map UI service names to actual Docker Compose service names
    const serviceNameMap: Record<string, string> = {
      'gateway': 'core',
      'observer': 'observer',
      'envoy': 'envoy',
      'autoheal': 'autoheal',
      'clickhouse': 'clickhouse',
      'litestream': 'litestream',
      'grafana': 'grafana',
      'ao-cu': 'ao-cu',
      'bundler': 'upload-service',
      'admin': 'admin-dashboard'
    }
    const actualServiceName = serviceNameMap[service] || service
    
    // First try to find the container using docker compose with the correct service name
    const { stdout: composeOutput } = await execAsync(`docker compose -p ar-io-node ps ${actualServiceName} --format "{{.Name}}" 2>/dev/null || echo ""`)
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

    let command = ''
    switch (action) {
      case 'start':
        command = `docker compose -p ar-io-node start ${actualServiceName} 2>/dev/null || docker start ${containerName}`
        break
      case 'stop':
        command = `docker stop ${containerName}`
        break
      case 'restart':
        // Use docker compose recreation to ensure environment variables are reloaded
        const arIoNodePath = process.env.AR_IO_NODE_PATH || '~/ar-io-node'
        command = `cd "${arIoNodePath}" && docker compose stop ${actualServiceName} && docker compose up -d ${actualServiceName} 2>/dev/null || docker restart ${containerName}`
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const { stdout } = await execAsync(command)
    
    // Add notification for successful container operation
    try {
      const serviceNameMap: Record<string, string> = {
        'gateway': 'Gateway',
        'observer': 'Observer',
        'envoy': 'Envoy',
        'autoheal': 'Autoheal',
        'clickhouse': 'Clickhouse',
        'litestream': 'Litestream',
        'grafana': 'Grafana',
        'ao-cu': 'AO CU',
        'bundler': 'Bundler',
        'admin': 'Admin Dashboard'
      }
      
      const serviceName = serviceNameMap[service] || service.charAt(0).toUpperCase() + service.slice(1)
      const actionPastTense = action === 'start' ? 'started' : action === 'stop' ? 'stopped' : 'restarted (configuration reloaded)'
      
      const notifications = await getNotificationsFromFile()
      const newId = notifications.length > 0 ? Math.max(...notifications.map(n => n.id)) + 1 : 1
      const newNotification = {
        id: newId,
        message: `${serviceName} service ${actionPastTense} successfully`,
        type: 'success' as const,
        time: new Date().toLocaleString(),
        read: false
      }
      
      notifications.unshift(newNotification)
      await saveNotificationsToFile(notifications)
    } catch (notificationError) {
      console.error('Failed to add notification:', notificationError)
      // Don't fail the main operation if notification fails
    }
    
    return NextResponse.json({ success: true, output: stdout })
  } catch (error) {
    console.error(`Error executing ${params.action} on ${params.service}:`, error)
    
    // Add error notification
    try {
      const serviceNameMap: Record<string, string> = {
        'gateway': 'Gateway',
        'observer': 'Observer',
        'envoy': 'Envoy',
        'autoheal': 'Autoheal',
        'clickhouse': 'Clickhouse',
        'litestream': 'Litestream',
        'grafana': 'Grafana',
        'ao-cu': 'AO CU',
        'bundler': 'Bundler',
        'admin': 'Admin Dashboard'
      }
      
      const serviceName = serviceNameMap[params.service] || params.service.charAt(0).toUpperCase() + params.service.slice(1)
      
      const notifications = await getNotificationsFromFile()
      const newId = notifications.length > 0 ? Math.max(...notifications.map(n => n.id)) + 1 : 1
      const newNotification = {
        id: newId,
        message: `Failed to ${params.action} ${serviceName} service: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error' as const,
        time: new Date().toLocaleString(),
        read: false
      }
      
      notifications.unshift(newNotification)
      await saveNotificationsToFile(notifications)
    } catch (notificationError) {
      console.error('Failed to add error notification:', notificationError)
    }
    
    return NextResponse.json({ error: 'Action failed' }, { status: 500 })
  }
}
