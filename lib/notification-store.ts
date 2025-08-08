import { readFile, writeFile, access, constants } from 'fs/promises'
import { join } from 'path'

// Define the path for the notifications JSON file in the writable /tmp directory
const NOTIFICATIONS_FILE_PATH = join('/tmp', 'notifications.json')

interface Notification {
  id: number
  message: string
  type: 'warning' | 'success' | 'error' | 'info' | 'debug'
  time: string
  read: boolean
}

/**
 * Reads notifications from the persistent file.
 * Initializes an empty file if it doesn't exist.
 */
export async function getNotificationsFromFile(): Promise<Notification[]> {
  try {
    // Check if the file exists
    await access(NOTIFICATIONS_FILE_PATH, constants.F_OK)
    const data = await readFile(NOTIFICATIONS_FILE_PATH, 'utf-8')
    return JSON.parse(data) as Notification[]
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // File does not exist, initialize with an empty array
      await writeFile(NOTIFICATIONS_FILE_PATH, '[]', 'utf-8')
      return []
    }
    console.error('Error reading notifications file:', error)
    throw new Error('Failed to read notifications')
  }
}

/**
 * Writes notifications to the persistent file.
 */
export async function saveNotificationsToFile(notifications: Notification[]): Promise<void> {
  try {
    await writeFile(NOTIFICATIONS_FILE_PATH, JSON.stringify(notifications, null, 2), 'utf-8')
  } catch (error) {
    console.error('Error writing notifications file:', error)
    throw new Error('Failed to save notifications')
  }
}
