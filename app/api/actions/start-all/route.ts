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
    // Get all stopped container names for the ar-io-node project, excluding the dashboard
    const { stdout: containerNamesOutput } = await execAsync(`docker compose -p ar-io-node ps -a --filter "status=exited" --format "table {{.Name}}" 2>/dev/null | tail -n +2 | tr -d ' ' || docker ps -a --filter "label=com.docker.compose.project=ar-io-node" --filter "status=exited" --format "{{.Names}}" 2>/dev/null || echo ""`)
    const allContainerNames = containerNamesOutput.trim().split('\n').filter(Boolean)
    
    // Filter out dashboard containers (anything with 'dashboard', 'setup-wizard', or 'admin' in the name)
    const containerNames = allContainerNames.filter(name => 
      !name.toLowerCase().includes('dashboard') && 
      !name.toLowerCase().includes('setup-wizard') && 
      !name.toLowerCase().includes('admin')
    )

    if (containerNames.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No stopped AR.IO containers found to start.',
        started: 0,
        failed: 0
      })
    }

    // Start each container
    const startPromises = containerNames.map(name => 
      execAsync(`docker start ${name} 2>/dev/null`)
    )

    const results = await Promise.allSettled(startPromises)
    
    // Count successful and failed starts
    const successCount = results.filter(result => result.status === 'fulfilled').length
    const failCount = results.filter(result => result.status === 'rejected').length
    
    // Add notification
    try {
      const notifications = await getNotificationsFromFile()
      const newId = notifications.length > 0 ? Math.max(...notifications.map(n => n.id)) + 1 : 1
      
      let message: string
      let type: 'success' | 'warning' | 'error'
      
      if (failCount === 0) {
        message = `All ${successCount} AR.IO services started successfully`
        type = 'success'
      } else if (successCount > 0) {
        message = `${successCount} services started successfully, ${failCount} failed`
        type = 'warning'
      } else {
        message = `Failed to start all ${failCount} services`
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
      console.error('Failed to add start-all notification:', notificationError)
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Attempted to start all AR.IO containers.',
      started: successCount,
      failed: failCount,
      total: containerNames.length
    })
  } catch (error) {
    console.error('Error starting all containers:', error)
    
    // Add error notification
    try {
      const notifications = await getNotificationsFromFile()
      const newId = notifications.length > 0 ? Math.max(...notifications.map(n => n.id)) + 1 : 1
      const newNotification = {
        id: newId,
        message: `Failed to start AR.IO services: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error' as const,
        time: new Date().toLocaleString(),
        read: false
      }
      
      notifications.unshift(newNotification)
      await saveNotificationsToFile(notifications)
    } catch (notificationError) {
      console.error('Failed to add error notification:', notificationError)
    }
    
    return NextResponse.json({ error: 'Failed to start all containers' }, { status: 500 })
  }
}
