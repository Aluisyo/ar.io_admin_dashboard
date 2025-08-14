import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import { getServerSession } from "next-auth/next"
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { join } from 'path'
import { existsSync } from 'fs'
<<<<<<< Updated upstream
import { homedir } from 'os'
=======
>>>>>>> Stashed changes

const execAsync = promisify(exec)

// Helper function to expand tilde to home directory
function expandPath(path: string): string {
  if (path.startsWith('~/') || path === '~') {
    return path.replace(/^~(?=$|\/|\\)/, homedir())
  }
  return path
}

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
<<<<<<< Updated upstream
    const arIoNodePath = expandPath(process.env.AR_IO_NODE_PATH || '~/ar-io-node')
=======
    const arIoNodePath = process.env.AR_IO_NODE_PATH || '/tmp/ar-io-node'
>>>>>>> Stashed changes
    const dockerComposeFile = join(arIoNodePath, 'docker-compose.yaml')
    const projectName = process.env.DOCKER_PROJECT || 'ar-io-node'
    
    console.log('Starting AR.IO Node update process...')
    console.log('- AR.IO Node Path:', arIoNodePath)
    console.log('- Project Name:', projectName)
    
    // Verify docker-compose.yaml exists
    if (!existsSync(dockerComposeFile)) {
      throw new Error(`Docker compose file not found at ${dockerComposeFile}`)
    }
    
    const updateSteps = []
    
<<<<<<< Updated upstream
    // Pull latest Docker images with better update detection
    console.log('Step 1: Pulling latest Docker images...')
    updateSteps.push('Pulling latest images')
    
    // Get image IDs before pull to compare
    const imageListCommand = `cd "${arIoNodePath}" && docker compose -f docker-compose.yaml -p ${projectName} images -q`
    let beforeImages = ''
    try {
      const { stdout } = await execAsync(imageListCommand)
      beforeImages = stdout.trim()
    } catch (error) {
      console.log('Could not get image list before pull, proceeding with pull...')
    }
    
=======
    // Step 1: Pull latest images
    console.log('Step 1: Pulling latest Docker images...')
    updateSteps.push('Pulling latest images')
>>>>>>> Stashed changes
    const pullCommand = `cd "${arIoNodePath}" && docker compose -f docker-compose.yaml -p ${projectName} pull`
    const { stdout: pullOutput, stderr: pullError } = await execAsync(pullCommand)
    console.log('Pull output:', pullOutput)
    if (pullError) console.log('Pull warnings:', pullError)
    
<<<<<<< Updated upstream
    // Get image IDs after pull to compare
    let afterImages = ''
    let imagesActuallyUpdated = false
    
    try {
      const { stdout } = await execAsync(imageListCommand)
      afterImages = stdout.trim()
      // Compare before and after image IDs to detect actual updates
      imagesActuallyUpdated = beforeImages !== afterImages
    } catch (error) {
      // Fallback to checking pull output for actual download indicators
      imagesActuallyUpdated = pullOutput.includes('Downloaded') || 
                             pullOutput.includes('Status: Downloaded') ||
                             pullOutput.includes('Pull complete') ||
                             (pullOutput.includes('Pulling') && !pullOutput.includes('Already exists'))
    }
    
    console.log('Before images:', beforeImages.substring(0, 100) + '...')
    console.log('After images:', afterImages.substring(0, 100) + '...')
    console.log('Images actually updated:', imagesActuallyUpdated)
    
    if (!imagesActuallyUpdated) {
=======
    // Check if any images were updated
    const imageUpdateCheck = pullOutput.includes('Downloaded') || pullOutput.includes('Pulled')
    if (!imageUpdateCheck && pullOutput.includes('up to date')) {
>>>>>>> Stashed changes
      return NextResponse.json({ 
        success: true, 
        message: 'AR.IO Node is already up to date. No updates available.',
        details: {
          stepsCompleted: ['Checked for updates'],
          pullOutput: pullOutput.trim(),
          imagesUpdated: false
        }
      })
    }
    
<<<<<<< Updated upstream
    // Stop services gracefully
=======
    // Step 2: Stop services gracefully (but don't remove volumes)
>>>>>>> Stashed changes
    console.log('Step 2: Stopping services...')
    updateSteps.push('Stopping services')
    const stopCommand = `cd "${arIoNodePath}" && docker compose -f docker-compose.yaml -p ${projectName} stop`
    await execAsync(stopCommand)
    
<<<<<<< Updated upstream
    // Remove old containers for clean restart
=======
    // Step 3: Remove old containers to ensure clean restart
>>>>>>> Stashed changes
    console.log('Step 3: Removing old containers...')
    updateSteps.push('Removing old containers')
    const rmCommand = `cd "${arIoNodePath}" && docker compose -f docker-compose.yaml -p ${projectName} rm -f`
    await execAsync(rmCommand)
    
<<<<<<< Updated upstream
    // Start services with updated images
=======
    // Step 4: Start services with updated images
>>>>>>> Stashed changes
    console.log('Step 4: Starting updated services...')
    updateSteps.push('Starting updated services')
    const upCommand = `cd "${arIoNodePath}" && docker compose -f docker-compose.yaml -p ${projectName} up -d`
    const { stdout: upOutput } = await execAsync(upCommand)
    console.log('Start output:', upOutput)
    
<<<<<<< Updated upstream
    // Verify all services are running properly
=======
    // Step 5: Verify services are running
>>>>>>> Stashed changes
    console.log('Step 5: Verifying services...')
    updateSteps.push('Verifying services')
    const psCommand = `cd "${arIoNodePath}" && docker compose -f docker-compose.yaml -p ${projectName} ps --format json`
    const { stdout: psOutput } = await execAsync(psCommand)
    
    let runningServices = 0
    let totalServices = 0
    
    try {
      const services = psOutput.trim().split('\n').filter(line => line).map(line => JSON.parse(line))
      totalServices = services.length
      runningServices = services.filter(s => s.State === 'running').length
    } catch (parseError) {
      console.log('Could not parse service status, using fallback')
<<<<<<< Updated upstream
      // Fallback container counting
      const { stdout: countOutput } = await execAsync(`docker ps -q --filter "label=com.docker.compose.project=${projectName}" | wc -l`)
      runningServices = parseInt(countOutput.trim()) || 0
      totalServices = runningServices
=======
      // Fallback: count containers
      const { stdout: countOutput } = await execAsync(`docker ps -q --filter "label=com.docker.compose.project=${projectName}" | wc -l`)
      runningServices = parseInt(countOutput.trim()) || 0
      totalServices = runningServices // Assume all running containers are the total
>>>>>>> Stashed changes
    }
    
    console.log(`Services status: ${runningServices}/${totalServices} running`)
    
<<<<<<< Updated upstream
    const success = runningServices > 0 && runningServices >= totalServices * 0.8
=======
    const success = runningServices > 0 && runningServices >= totalServices * 0.8 // At least 80% should be running
>>>>>>> Stashed changes
    
    if (success) {
      return NextResponse.json({ 
        success: true, 
        message: `AR.IO Node updated successfully! ${runningServices}/${totalServices} services running.`,
        details: {
          stepsCompleted: updateSteps,
          servicesRunning: runningServices,
          totalServices: totalServices,
          imagesUpdated: true,
          pullOutput: pullOutput.trim()
        }
      })
    } else {
      return NextResponse.json({ 
        error: `Update completed but some services may not be running properly (${runningServices}/${totalServices})`, 
        details: {
          stepsCompleted: updateSteps,
          servicesRunning: runningServices,
          totalServices: totalServices
        }
      }, { status: 500 })
    }
    
  } catch (error) {
    console.error('Error updating AR.IO Node:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return NextResponse.json({ 
      error: 'Failed to update AR.IO Node', 
      details: errorMessage 
    }, { status: 500 })
  }
}
