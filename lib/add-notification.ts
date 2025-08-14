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
<<<<<<< Updated upstream
    if (result.notification) {
      console.log('Notification added:', result.notification);
    } else {
      console.log('Duplicate notification prevented:', message);
    }
=======
    console.log('Notification added:', result.notification);
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
export const notifyStopAll = (details?: { successCount: number, failCount: number, totalContainers: number }) => {
  if (!details) {
    return addSuccessNotification('All AR.IO services stopped successfully');
  }
  
  const { successCount, failCount } = details;
  
  if (failCount === 0) {
    return addSuccessNotification(`All ${successCount} AR.IO services stopped successfully`);
  } else if (successCount > 0) {
    return addWarningNotification(`${successCount} services stopped successfully, ${failCount} failed`);
  } else {
    return addErrorNotification(`Failed to stop all ${failCount} services`);
  }
};

export const notifyStartAll = (details?: { started: number, failed: number, total: number }) => {
  if (!details) {
    return addSuccessNotification('All AR.IO services started successfully');
  }
  
  const { started, failed } = details;
  
  if (failed === 0) {
    return addSuccessNotification(`All ${started} AR.IO services started successfully`);
  } else if (started > 0) {
    return addWarningNotification(`${started} services started successfully, ${failed} failed`);
  } else {
    return addErrorNotification(`Failed to start all ${failed} services`);
  }
};

export const notifyBackup = (details?: { filesBackedUp: number, fileSize: string, backupPath: string }) => {
  const message = details 
    ? `Configuration backup completed: ${details.filesBackedUp} files backed up (${details.fileSize}) - saved to ${details.backupPath}`
=======
export const notifyBackup = (details?: { filesBackedUp: number, fileSize: string, backupPath: string }) => {
  const message = details 
    ? `Configuration backup completed: ${details.filesBackedUp} files backed up (${details.fileSize})`
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream

// Container operation notifications
export const notifyContainerStart = (serviceName: string) => {
  return addSuccessNotification(`${serviceName} service started successfully`);
};

export const notifyContainerStop = (serviceName: string) => {
  return addInfoNotification(`${serviceName} service stopped successfully`);
};

export const notifyContainerRestart = (serviceName: string) => {
  return addSuccessNotification(`${serviceName} service restarted successfully`);
};

export const notifyContainerError = (serviceName: string, action: string, error: string) => {
  return addErrorNotification(`Failed to ${action} ${serviceName} service: ${error}`);
};

// System-wide notifications
export const notifySystemHealthCheck = (healthyServices: number, totalServices: number) => {
  if (healthyServices === totalServices) {
    return addSuccessNotification(`All ${totalServices} services are running healthy`);
  } else {
    return addWarningNotification(`${healthyServices}/${totalServices} services are healthy`);
  }
};

export const notifyDiskSpaceWarning = (usage: number, path: string) => {
  return addWarningNotification(`Disk usage is ${usage}% on ${path} - consider freeing up space`);
};

export const notifyConfigurationChange = (component: string) => {
  return addInfoNotification(`Configuration updated for ${component}`);
};

export const notifyServiceUnhealthy = (serviceName: string, reason: string) => {
  return addWarningNotification(`${serviceName} service health check failed: ${reason}`);
};
=======
>>>>>>> Stashed changes
