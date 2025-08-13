import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import { getServerSession } from "next-auth/next"
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { getNotificationsFromFile, saveNotificationsToFile } from '@/lib/notification-store'

const execAsync = promisify(exec)

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get all running container names for the ar-io-node project, excluding the dashboard
    const { stdout: containerNamesOutput } = await execAsync(`docker compose -p ar-io-node ps -q 2>/dev/null | xargs -r docker inspect --format='{{.Name}}' | sed 's|^/||' || docker ps -a --filter "label=com.docker.compose.project=ar-io-node" --format "{{.Names}}" 2>/dev/null || echo ""`)
    const allContainerNames = containerNamesOutput.trim().split('\n').filter(Boolean)
    
    // Filter out dashboard containers (anything with 'dashboard', 'setup-wizard', or 'admin' in the name)
    const containerNames = allContainerNames.filter(name => 
      !name.toLowerCase().includes('dashboard') && 
      !name.toLowerCase().includes('setup-wizard') && 
      !name.toLowerCase().includes('admin')
    )

    if (containerNames.length === 0) {
      return NextResponse.json({ success: true, message: 'No AR.IO containers found to stop.' })
    }

    // Stop each container
    const stopPromises = containerNames.map(name => 
      execAsync(`docker stop ${name} 2>/dev/null`)
    )

    const results = await Promise.allSettled(stopPromises) // Use allSettled to ensure all promises run even if some fail
    
    // Count successful and failed stops
    const successCount = results.filter(result => result.status === 'fulfilled').length
    const failCount = results.filter(result => result.status === 'rejected').length
    
    // Add notification
    try {
      const notifications = await getNotificationsFromFile()
      const newId = notifications.length > 0 ? Math.max(...notifications.map(n => n.id)) + 1 : 1
      
      let message: string
      let type: 'success' | 'warning' | 'error'
      
      if (failCount === 0) {
        message = `All ${successCount} AR.IO services stopped successfully`
        type = 'success'
      } else if (successCount > 0) {
        message = `${successCount} services stopped successfully, ${failCount} failed`
        type = 'warning'
      } else {
        message = `Failed to stop all ${failCount} services`
        type = 'error'
      }
      
      const newNotification = {
        id: newId,
        message,
        type,
        time: new Date().toLocaleString(),
        read: false
      }
      
      notifications.unshift(newNotification)
      await saveNotificationsToFile(notifications)
    } catch (notificationError) {
      console.error('Failed to add stop-all notification:', notificationError)
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Attempted to stop all AR.IO containers.',
      stopped: successCount,
      failed: failCount,
      total: containerNames.length,
      details: {
        successCount,
        failCount,
        totalContainers: containerNames.length
      }
    })
  } catch (error) {
    console.error('Error stopping all containers:', error)
    
    // Add error notification
    try {
      const notifications = await getNotificationsFromFile()
      const newId = notifications.length > 0 ? Math.max(...notifications.map(n => n.id)) + 1 : 1
      const newNotification = {
        id: newId,
        message: `Failed to stop AR.IO services: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error' as const,
        time: new Date().toLocaleString(),
        read: false
      }
      
      notifications.unshift(newNotification)
      await saveNotificationsToFile(notifications)
    } catch (notificationError) {
      console.error('Failed to add error notification:', notificationError)
    }
    
    return NextResponse.json({ error: 'Failed to stop all containers' }, { status: 500 })
  }
}
