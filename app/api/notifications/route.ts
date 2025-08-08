import { NextResponse } from 'next/server'
import { getServerSession } from "next-auth/next"
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { getNotificationsFromFile, saveNotificationsToFile } from '@/lib/notification-store' // Import the new utility

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const notifications = await getNotificationsFromFile()
    return NextResponse.json(notifications)
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { action, id, message, type, time } = await request.json();
    let notifications = await getNotificationsFromFile(); // Get current notifications

    if (action === 'mark-all-read') {
      notifications = notifications.map(n => ({ ...n, read: true }));
      await saveNotificationsToFile(notifications);
      return NextResponse.json({ success: true, message: 'All notifications marked as read' });
    } else if (action === 'mark-read' && id) {
      notifications = notifications.map(n => n.id === id ? { ...n, read: true } : n);
      await saveNotificationsToFile(notifications);
      return NextResponse.json({ success: true, message: `Notification ${id} marked as read` });
    } else if (action === 'add') {
      const newId = notifications.length > 0 ? Math.max(...notifications.map(n => n.id)) + 1 : 1;
      const newNotification = { id: newId, message, type, time: time || new Date().toLocaleString(), read: false };
      notifications.unshift(newNotification); // Add to the beginning
      await saveNotificationsToFile(notifications);
      return NextResponse.json({ success: true, notification: newNotification });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error processing notification action:', error);
    return NextResponse.json({ error: 'Failed to process notification action' }, { status: 500 });
  }
}
