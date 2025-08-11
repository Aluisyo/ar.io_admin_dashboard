// Utility function to add notifications
export async function addNotification(
  message: string, 
  type: 'warning' | 'success' | 'error' | 'info' | 'debug'
) {
  try {
    const response = await fetch('/api/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'add',
        message,
        type,
        time: new Date().toLocaleString(),
      }),
    });

    if (!response.ok) {
      console.error('Failed to add notification:', response.statusText);
      return false;
    }

    const result = await response.json();
    console.log('Notification added:', result.notification);
    return true;
  } catch (error) {
    console.error('Error adding notification:', error);
    return false;
  }
}

// Helper functions for different notification types
export const addSuccessNotification = (message: string) => addNotification(message, 'success');
export const addErrorNotification = (message: string) => addNotification(message, 'error');
export const addWarningNotification = (message: string) => addNotification(message, 'warning');
export const addInfoNotification = (message: string) => addNotification(message, 'info');

// Specific notifications for quick actions
export const notifyRestart = (serviceName?: string) => {
  const message = serviceName 
    ? `Service "${serviceName}" restarted successfully`
    : 'All AR.IO services restarted successfully';
  return addSuccessNotification(message);
};

export const notifyBackup = (details?: { filesBackedUp: number, fileSize: string, backupPath: string }) => {
  const message = details 
    ? `Configuration backup completed: ${details.filesBackedUp} files backed up (${details.fileSize})`
    : 'Configuration backup completed successfully';
  return addSuccessNotification(message);
};

export const notifyUpdate = (details?: { servicesRunning: number, totalServices: number, imagesUpdated: boolean }) => {
  if (details && !details.imagesUpdated) {
    return addInfoNotification('AR.IO Node checked for updates - already up to date');
  }
  
  const message = details 
    ? `AR.IO Node updated successfully: ${details.servicesRunning}/${details.totalServices} services running`
    : 'AR.IO Node updated successfully';
  return addSuccessNotification(message);
};

export const notifyError = (action: string, error: string) => {
  return addErrorNotification(`Failed to ${action}: ${error}`);
};

// Boot loop detection notification
export const notifyBootLoop = (serviceName: string, restartCount: number) => {
  return addWarningNotification(
    `Service "${serviceName}" appears to be in a boot loop (${restartCount} restarts in the last 5 minutes)`
  );
};
