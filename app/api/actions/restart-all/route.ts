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
    // Get all running container names for the ar-io-node project
    const { stdout: containerNamesOutput } = await execAsync(`docker compose -p ar-io-node ps -q 2>/dev/null || docker ps -a --filter "label=com.docker.compose.project=ar-io-node" --format "{{.Names}}" 2>/dev/null || echo ""`)
    const containerNames = containerNamesOutput.trim().split('\n').filter(Boolean)

    if (containerNames.length === 0) {
      return NextResponse.json({ success: true, message: 'No AR.IO containers found to restart.' })
    }

    // Restart each container
    const restartPromises = containerNames.map(name => 
      execAsync(`docker restart ${name} 2>/dev/null`)
    )

    const results = await Promise.allSettled(restartPromises) // Use allSettled to ensure all promises run even if some fail
    
    // Count successful and failed restarts
    const successCount = results.filter(result => result.status === 'fulfilled').length
    const failCount = results.filter(result => result.status === 'rejected').length
    
    // Add notification
    try {
      const notifications = await getNotificationsFromFile()
      const newId = notifications.length > 0 ? Math.max(...notifications.map(n => n.id)) + 1 : 1
      
      let message: string
      let type: 'success' | 'warning' | 'error'
      
      if (failCount === 0) {
        message = `All ${successCount} AR.IO services restarted successfully`
        type = 'success'
      } else if (successCount > 0) {
        message = `${successCount} services restarted successfully, ${failCount} failed`
        type = 'warning'
      } else {
        message = `Failed to restart all ${failCount} services`
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
      console.error('Failed to add restart-all notification:', notificationError)
    }

    return NextResponse.json({ success: true, message: 'Attempted to restart all AR.IO containers.' })
  } catch (error) {
    console.error('Error restarting all containers:', error)
    return NextResponse.json({ error: 'Failed to restart all containers' }, { status: 500 })
  }
}
