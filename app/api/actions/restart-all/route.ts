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
    console.log('Performing complete AR.IO stack recreation to reload configuration...')
    
    const arIoNodePath = process.env.AR_IO_NODE_PATH || '~/ar-io-node'
    const command = `cd "${arIoNodePath}" && docker compose down && docker compose up -d`
    const { stdout } = await execAsync(command)
    
    const { stdout: servicesOutput } = await execAsync(`cd "${arIoNodePath}" && docker compose config --services 2>/dev/null || echo ""`)
    const services = servicesOutput.trim().split('\n').filter(Boolean)
    const successCount = services.length
    const failCount = 0
    
    try {
      const notifications = await getNotificationsFromFile()
      const newId = notifications.length > 0 ? Math.max(...notifications.map(n => n.id)) + 1 : 1
      
      const message = `All ${successCount} AR.IO services recreated successfully (configuration reloaded)`
      const type = 'success'
      
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

    return NextResponse.json({ 
      success: true, 
      message: 'AR.IO stack recreated successfully. All configuration changes have been reloaded.',
      restarted: successCount,
      failed: failCount,
      total: successCount,
      details: {
        successCount,
        failCount,
        totalContainers: successCount,
        output: stdout
      }
    })
  } catch (error) {
    console.error('Error recreating AR.IO stack:', error)
    
    // Add error notification
    try {
      const notifications = await getNotificationsFromFile()
      const newId = notifications.length > 0 ? Math.max(...notifications.map(n => n.id)) + 1 : 1
      const newNotification = {
        id: newId,
        message: `Failed to recreate AR.IO stack: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error' as const,
        time: new Date().toLocaleString(),
        read: false
      }
      
      notifications.unshift(newNotification)
      await saveNotificationsToFile(notifications)
    } catch (notificationError) {
      console.error('Failed to add error notification:', notificationError)
    }
    
    return NextResponse.json({ error: 'Failed to recreate AR.IO stack' }, { status: 500 })
  }
}
