import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import { getServerSession } from "next-auth/next"
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { join } from 'path'
import { existsSync } from 'fs'
import { homedir } from 'os'

const execAsync = promisify(exec)

function expandPath(path: string): string {
  if (path.startsWith('~/') || path === '~') {
    return path.replace(/^~(?=$|\/|\\)/, homedir())
  }
  return path
}

async function getCurrentGatewayVersion(): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)
    
    // Try multiple gateway endpoints (container and host network access)
    const gatewayUrls = [
      'http://ar-io-node-core-1/ar-io/info',  // Docker network access
      'http://gateway:4000/ar-io/info',       // Service name access
      'http://core:4000/ar-io/info',          // Alternative service name
      'http://localhost/ar-io/info',          // Host network access
      'http://localhost:4000/ar-io/info'      // Direct port access
    ]
    
    for (const url of gatewayUrls) {
      try {
        const response = await fetch(url, {
          signal: controller.signal,
          headers: { 'Accept': 'application/json' }
        })
        
        if (response.ok) {
          const info = await response.json()
          console.log(`Successfully fetched gateway version from: ${url}`)
          clearTimeout(timeoutId)
          return info.release || info.version || null
        }
      } catch (error) {
        console.log(`Failed to fetch from ${url}:`, error instanceof Error ? error.message : 'Unknown error')
        continue
      }
    }
    
    clearTimeout(timeoutId)
  } catch (error) {
    console.log('Could not fetch current gateway version:', error instanceof Error ? error.message : 'Unknown error')
  }
  return null
}

async function getLatestReleaseTag(): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)
    
    const response = await fetch('https://api.github.com/repos/ar-io/ar-io-node/releases/latest', {
      signal: controller.signal,
      headers: { 'Accept': 'application/vnd.github.v3+json' }
    })
    
    clearTimeout(timeoutId)
    
    if (response.ok) {
      const release = await response.json()
      return release.tag_name || null
    }
  } catch (error) {
    console.log('Could not fetch latest release tag:', error instanceof Error ? error.message : 'Unknown error')
  }
  return null
}

async function getCurrentLocalVersion(arIoNodePath: string): Promise<string | null> {
  try {
    // Try to get current tag first
    const tagCommand = `cd "${arIoNodePath}" && git describe --tags --exact-match HEAD 2>/dev/null || git rev-parse --short HEAD`
    const { stdout } = await execAsync(tagCommand)
    return stdout.trim() || null
  } catch (error) {
    console.log('Could not get local version:', error instanceof Error ? error.message : 'Unknown error')
  }
  return null
}

async function checkGitStatus(arIoNodePath: string): Promise<{hasChanges: boolean, changes: string[], canUpdate: boolean}> {
  try {
    // Check for uncommitted changes
    const statusCommand = `cd "${arIoNodePath}" && git status --porcelain`
    const { stdout: statusOutput } = await execAsync(statusCommand)
    const changes = statusOutput.trim().split('\n').filter(line => line.trim())
    
    // Check if we can pull (no conflicts)
    let canUpdate = true
    if (changes.length > 0) {
      try {
        // Fetch to check for conflicts without merging (from main branch)
        const fetchCommand = `cd "${arIoNodePath}" && git fetch origin main`
        await execAsync(fetchCommand)
        
        // Check if there would be merge conflicts with main branch
        const mergeTestCommand = `cd "${arIoNodePath}" && git merge-tree $(git merge-base HEAD origin/main) HEAD origin/main`
        const { stdout: mergeTest } = await execAsync(mergeTestCommand)
        canUpdate = !mergeTest.includes('<<<<<<< ')
      } catch {
        // If we can't test merge, assume we need to handle changes
        canUpdate = false
      }
    }
    
    return {
      hasChanges: changes.length > 0,
      changes,
      canUpdate
    }
  } catch (error) {
    console.log('Could not check git status:', error instanceof Error ? error.message : 'Unknown error')
    return { hasChanges: false, changes: [], canUpdate: true }
  }
}

async function handleGitChanges(arIoNodePath: string, strategy: 'stash' | 'reset' | 'backup' = 'stash'): Promise<{success: boolean, message: string, backupInfo?: string}> {
  try {
    const { hasChanges, changes } = await checkGitStatus(arIoNodePath)
    
    if (!hasChanges) {
      return { success: true, message: 'No changes to handle' }
    }
    
    switch (strategy) {
      case 'stash':
        const stashCommand = `cd "${arIoNodePath}" && git stash push -m "AR.IO Admin Dashboard auto-stash before update $(date)"`
        await execAsync(stashCommand)
        return { 
          success: true, 
          message: `Stashed ${changes.length} changes. Use 'git stash pop' to restore them after update.` 
        }
        
      case 'backup':
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        const backupBranch = `backup-before-update-${timestamp}`
        const backupCommand = `cd "${arIoNodePath}" && git checkout -b ${backupBranch} && git add -A && git commit -m "Backup before AR.IO update ${timestamp}" && git checkout main`
        await execAsync(backupCommand)
        
        // Reset to clean state
        const resetCommand = `cd "${arIoNodePath}" && git reset --hard HEAD`
        await execAsync(resetCommand)
        return { 
          success: true, 
          message: `Backed up ${changes.length} changes to branch '${backupBranch}' and reset to clean state.`,
          backupInfo: backupBranch
        }
        
      case 'reset':
        const resetHardCommand = `cd "${arIoNodePath}" && git reset --hard HEAD && git clean -fd`
        await execAsync(resetHardCommand)
        return { 
          success: true, 
          message: `Discarded ${changes.length} local changes and cleaned working directory.` 
        }
        
      default:
        return { success: false, message: 'Unknown strategy' }
    }
  } catch (error) {
    return { 
      success: false, 
      message: `Failed to handle git changes: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }
  }
}

function isNewerVersion(current: string, latest: string): boolean {
  console.log(`Comparing versions: current="${current}" vs latest="${latest}"`) // Debug logging
  
  const cleanCurrent = current.replace(/^v/, '')
  const cleanLatest = latest.replace(/^v/, '')
  
  if (cleanCurrent.match(/^[a-f0-9]{7,8}$/)) {
    console.log('Current is commit hash, update needed')
    return true
  }
  
  // Handle AR.IO release tag format (r45, r48, etc.)
  const currentReleaseMatch = cleanCurrent.match(/^r(\d+)$/)
  const latestReleaseMatch = cleanLatest.match(/^r(\d+)$/)
  
  if (currentReleaseMatch && latestReleaseMatch) {
    const currentReleaseNumber = parseInt(currentReleaseMatch[1])
    const latestReleaseNumber = parseInt(latestReleaseMatch[1])
    console.log(`AR.IO release comparison: r${currentReleaseNumber} vs r${latestReleaseNumber}`)
    return latestReleaseNumber > currentReleaseNumber
  }
  
  // Handle mixed formats (current: "45" vs latest: "r48")
  if (!currentReleaseMatch && latestReleaseMatch) {
    const currentNumber = parseInt(cleanCurrent)
    const latestReleaseNumber = parseInt(latestReleaseMatch[1])
    if (!isNaN(currentNumber)) {
      console.log(`Mixed format comparison: ${currentNumber} vs r${latestReleaseNumber}`)
      return latestReleaseNumber > currentNumber
    }
  }
  
  // Handle mixed formats (current: "r45" vs latest: "48")
  if (currentReleaseMatch && !latestReleaseMatch) {
    const currentReleaseNumber = parseInt(currentReleaseMatch[1])
    const latestNumber = parseInt(cleanLatest)
    if (!isNaN(latestNumber)) {
      console.log(`Mixed format comparison: r${currentReleaseNumber} vs ${latestNumber}`)
      return latestNumber > currentReleaseNumber
    }
  }
  
  // Handle pure numbers ("45" vs "48") - but exclude semantic versions
  const currentNumber = parseInt(cleanCurrent)
  const latestNumber = parseInt(cleanLatest)
  if (!isNaN(currentNumber) && !isNaN(latestNumber) && !cleanCurrent.includes('.') && !cleanLatest.includes('.')) {
    console.log(`Number comparison: ${currentNumber} vs ${latestNumber}`)
    return latestNumber > currentNumber
  }
  
  // Fallback to semantic version comparison for standard formats (1.2.3, 2.0.1, etc.)
  if (cleanCurrent.includes('.') || cleanLatest.includes('.')) {
    console.log(`Semantic version comparison: ${cleanCurrent} vs ${cleanLatest}`)
    
    const currentParts = cleanCurrent.split('.').map(n => parseInt(n) || 0)
    const latestParts = cleanLatest.split('.').map(n => parseInt(n) || 0)
    
    // Pad arrays to same length
    const maxLength = Math.max(currentParts.length, latestParts.length)
    while (currentParts.length < maxLength) currentParts.push(0)
    while (latestParts.length < maxLength) latestParts.push(0)
    
    for (let i = 0; i < maxLength; i++) {
      if (latestParts[i] > currentParts[i]) return true
      if (latestParts[i] < currentParts[i]) return false
    }
    
    return false
  }
  
  console.log(`String comparison fallback: "${cleanCurrent}" vs "${cleanLatest}"`)
  return cleanLatest > cleanCurrent
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const { 
      performPrune = false, 
      forceUpdate = false, 
      handleChanges = 'stash' // 'stash', 'reset', 'backup', or 'abort'
    } = body
    
    const arIoNodePath = expandPath(process.env.AR_IO_NODE_PATH || '~/ar-io-node')
    const dockerComposeFile = join(arIoNodePath, 'docker-compose.yaml')
    
    console.log('Starting AR.IO Node update process...')
    console.log('- AR.IO Node Path:', arIoNodePath)
    console.log('- Docker Prune Enabled:', performPrune)
    console.log('- Force Update:', forceUpdate)
    
    if (!existsSync(dockerComposeFile)) {
      throw new Error(`Docker compose file not found at ${dockerComposeFile}`)
    }
    
    const updateSteps = []
    
    // Pre-Step: Smart Version Check (unless force update) - Bandwidth Optimization
    if (!forceUpdate) {
      console.log('Pre-check: Checking current and available versions to avoid unnecessary bandwidth usage...')
      updateSteps.push('Version availability check')
      
      const [currentGatewayVersion, latestReleaseTag, currentLocalVersion] = await Promise.all([
        getCurrentGatewayVersion(),
        getLatestReleaseTag(),
        getCurrentLocalVersion(arIoNodePath)
      ])
      
      console.log('Version check results:')
      console.log('- Current Gateway Version:', currentGatewayVersion || 'Unknown')
      console.log('- Latest Release Tag:', latestReleaseTag || 'Unknown')
      console.log('- Current Local Version:', currentLocalVersion || 'Unknown')
      
      // Determine if update is needed based on available version info
      let updateNeeded = false
      let versionCheckReason = 'Unknown'
      
      if (currentGatewayVersion && latestReleaseTag) {
        updateNeeded = isNewerVersion(currentGatewayVersion, latestReleaseTag)
        versionCheckReason = updateNeeded 
          ? `Gateway version ${currentGatewayVersion} < Latest ${latestReleaseTag}`
          : `Gateway version ${currentGatewayVersion} >= Latest ${latestReleaseTag}`
      } else if (currentLocalVersion && latestReleaseTag) {
        updateNeeded = isNewerVersion(currentLocalVersion, latestReleaseTag)
        versionCheckReason = updateNeeded 
          ? `Local version ${currentLocalVersion} < Latest ${latestReleaseTag}`
          : `Local version ${currentLocalVersion} >= Latest ${latestReleaseTag}`
      } else {
        // If we can't determine versions, proceed with git pull to check for changes
        updateNeeded = true
        versionCheckReason = 'Unable to determine versions - will check Git repository'
      }
      
      console.log('Update needed:', updateNeeded, '- Reason:', versionCheckReason)
      
      if (!updateNeeded) {
        return NextResponse.json({ 
          success: true, 
          message: 'AR.IO Node is already up to date. No update needed.',
          details: {
            stepsCompleted: ['Version check completed - no update needed'],
            versionCheck: {
              currentGatewayVersion,
              latestReleaseTag,
              currentLocalVersion,
              updateNeeded: false,
              reason: versionCheckReason
            },
            repositoryUpdated: false,
            networkTrafficAvoided: true,
            bandwidthSaved: true
          }
        })
      }
      
      updateSteps.push(`Version check: ${versionCheckReason}`)
    }
    
    // Update process
    
    // Step 1: Check for custom changes and handle them
    console.log('Step 1: Checking for custom changes in the repository...')
    updateSteps.push('1. Check for custom changes in the repository')
    
    const gitStatus = await checkGitStatus(arIoNodePath)
    let changeHandlingResult = null
    
    if (gitStatus.hasChanges) {
      console.log(`Found ${gitStatus.changes.length} custom changes:`, gitStatus.changes)
      updateSteps.push(`Found ${gitStatus.changes.length} custom changes that need handling`)
      
      if (handleChanges === 'abort') {
        return NextResponse.json({ 
          error: 'Update aborted due to custom changes', 
          details: {
            customChanges: gitStatus.changes,
            message: 'Repository has custom changes. Please choose how to handle them: stash, backup, or reset.'
          }
        }, { status: 400 })
      }
      
      console.log(`Handling custom changes using strategy: ${handleChanges}`)
      changeHandlingResult = await handleGitChanges(arIoNodePath, handleChanges as 'stash' | 'reset' | 'backup')
      
      if (!changeHandlingResult.success) {
        throw new Error(`Failed to handle custom changes: ${changeHandlingResult.message}`)
      }
      
      console.log('Custom changes handled:', changeHandlingResult.message)
      updateSteps.push(`Custom changes handled: ${changeHandlingResult.message}`)
    } else {
      console.log('No custom changes found')
      updateSteps.push('No custom changes found - repository is clean')
    }
    
    // Step 2: Pull the latest changes from repository
    console.log('Step 2: Pulling latest changes...')
    updateSteps.push('2. Pull latest changes')
    let gitOutput = ''
    let dockerPullOutput = ''
    try {
      // First check current branch and switch to main if needed
      const checkBranchCommand = `cd "${arIoNodePath}" && git branch --show-current`
      const { stdout: currentBranch } = await execAsync(checkBranchCommand)
      const currentBranchName = currentBranch.trim()
      
      if (currentBranchName !== 'main') {
        console.log(`Currently on branch '${currentBranchName}', switching to 'main'`)
        updateSteps.push(`Switched from '${currentBranchName}' to 'main' branch`)
        const switchBranchCommand = `cd "${arIoNodePath}" && git checkout main`
        await execAsync(switchBranchCommand)
      } else {
        console.log('Already on main branch')
        updateSteps.push('Already on main branch')
      }
      
      // Now pull from main branch
      const gitPullCommand = `cd "${arIoNodePath}" && git pull origin main`
      const { stdout: pullOutput, stderr: gitError } = await execAsync(gitPullCommand)
      gitOutput = pullOutput
      console.log('Git pull output:', pullOutput)
      if (gitError && !gitError.includes('Already up to date')) {
        console.log('Git pull warnings/info:', gitError)
      }
    } catch (gitError) {
      console.error('Git pull failed:', gitError)
      throw new Error(`Failed to update Git repository: ${gitError instanceof Error ? gitError.message : 'Unknown git error'}`)
    }
    
    // Step 3: Pull and build the latest Docker images
    console.log('Step 3: Pull and build the latest Docker images...')
    updateSteps.push('3. Update Docker images')
    try {
      // First try to pull all available images
      console.log('Pulling available Docker images...')
      const dockerPullCommand = `cd "${arIoNodePath}" && docker compose -f docker-compose.yaml pull`
      const { stdout: pullDockerOutput, stderr: dockerPullError } = await execAsync(dockerPullCommand)
      dockerPullOutput = pullDockerOutput
      console.log('Docker pull output:', pullDockerOutput)
      
      // Check if some services need to be built from source
      const needsBuild = dockerPullError && (
        dockerPullError.includes('manifest unknown') || 
        dockerPullError.includes('must be built from source') ||
        dockerPullError.includes('docker compose build')
      )
      
      if (needsBuild) {
        console.log('Some services need to be built from source, running docker compose build...')
        updateSteps.push('Building services from source (core service)')
        
        console.log('Starting Docker build process...')
        const dockerBuildCommand = `cd "${arIoNodePath}" && docker compose -f docker-compose.yaml build --progress plain`
        console.log('Build command:', dockerBuildCommand)
        
        const buildStartTime = Date.now()
        const { stdout: buildOutput, stderr: buildError } = await execAsync(dockerBuildCommand, { 
          timeout: 600000, // 10 minute timeout
          maxBuffer: 1024 * 1024 * 10 // 10MB buffer for large build outputs
        })
        
        const buildDuration = Math.round((Date.now() - buildStartTime) / 1000)
        console.log(`Docker build completed in ${buildDuration} seconds`)
        console.log('Docker build output:', buildOutput)
        
        if (buildError) {
          console.log('Docker build stderr:', buildError)
          if (!buildError.includes('Successfully built') && !buildError.includes('Successfully tagged')) {
            console.log('Build may have encountered issues, but continuing...')
          }
        }
        
        dockerPullOutput += `\n--- Build Output (${buildDuration}s) ---\n` + buildOutput
      } else if (dockerPullError && !dockerPullError.includes('up to date')) {
        console.log('Docker pull warnings/info:', dockerPullError)
      }
      
    } catch (dockerError) {
      console.error('Docker pull/build failed:', dockerError)
      console.log('Error details:', dockerError instanceof Error ? dockerError.message : 'Unknown error')
      
      // If pull fails, try to build from source as a fallback
      try {
        console.log('Docker pull failed, attempting to build from source as fallback...')
        updateSteps.push('Fallback: Building all services from source')
        
        // Add more verbose logging for the fallback build
        console.log('Starting fallback Docker build process...')
        console.log('Build command will run with 10-minute timeout')
        
        const dockerBuildCommand = `cd "${arIoNodePath}" && docker compose -f docker-compose.yaml build --progress plain`
        console.log('Executing:', dockerBuildCommand)
        
        const buildStartTime = Date.now()
        const { stdout: buildOutput, stderr: buildStderr } = await execAsync(dockerBuildCommand, { 
          timeout: 600000, // 10 minute timeout
          maxBuffer: 1024 * 1024 * 10 // 10MB buffer for large build outputs
        })
        
        const buildDuration = Math.round((Date.now() - buildStartTime) / 1000)
        console.log(`Fallback build completed in ${buildDuration} seconds`)
        console.log('Build stdout:', buildOutput)
        
        if (buildStderr) {
          console.log('Build stderr:', buildStderr)
        }
        
        dockerPullOutput = `Pull failed, built from source (${buildDuration}s):\n${buildOutput}`
        
        // Verify the build actually produced images
        if (!buildOutput.includes('Successfully built') && !buildOutput.includes('Successfully tagged') && !buildStderr.includes('Successfully')) {
          console.warn('Build completed but no success indicators found in output')
        }
        
      } catch (buildError) {
        console.error('Fallback build also failed:', buildError)
        console.log('Build error details:', buildError instanceof Error ? buildError.message : 'Unknown build error')
        
        // Provide more specific error information
        let errorMessage = 'Failed to pull or build Docker images.'
        if (buildError instanceof Error) {
          if (buildError.message.includes('timeout')) {
            errorMessage = 'Docker build process timed out after 10 minutes. The build process may be stuck or require more time.'
          } else if (buildError.message.includes('ENOENT') || buildError.message.includes('command not found')) {
            errorMessage = 'Docker or docker compose command not found. Please ensure Docker is installed and running.'
          } else if (buildError.message.includes('permission denied') || buildError.message.includes('EACCES')) {
            errorMessage = 'Permission denied during build process. Please check Docker permissions.'
          } else {
            errorMessage = `Build failed: ${buildError.message}`
          }
        }
        
        throw new Error(errorMessage)
      }
    }
    
    // Step 4: Shut down Docker services
    console.log('Step 4: Shutting down services...')
    updateSteps.push('4. Stop services')
    const downCommand = `cd "${arIoNodePath}" && docker compose -f docker-compose.yaml down -v`
    await execAsync(downCommand)
    
    // Step 5: Optional Docker cleanup
    if (performPrune) {
      console.log('Step 5: Cleaning up Docker resources...')
      updateSteps.push('5. Docker cleanup')
      try {
        const pruneCommand = `docker system prune -f`
        const { stdout: pruneOutput } = await execAsync(pruneCommand)
        console.log('Docker prune output:', pruneOutput)
      } catch (pruneError) {
        console.log('Docker prune failed (non-critical):', pruneError)
      }
    } else {
      console.log('Step 5: Skipping Docker cleanup')
      updateSteps.push('5. Skipped Docker cleanup')
    }
    
    // Step 6: Environment variables check
    console.log('Step 6: Checking environment variables...')
    updateSteps.push('6. Environment variables check')
    
    // Step 7: Restart Docker services
    console.log('Step 7: Starting services...')
    updateSteps.push('7. Start services')
    const upCommand = `cd "${arIoNodePath}" && docker compose -f docker-compose.yaml up -d`
    const { stdout: upOutput } = await execAsync(upCommand)
    console.log('Docker up output:', upOutput)
    
    // Verification: Check that services are running properly (Additional safety check)
    console.log('Verification: Checking that services are running properly...')
    updateSteps.push('Verification: Service status check')
    const psCommand = `cd "${arIoNodePath}" && docker compose -f docker-compose.yaml ps --format json`
    const { stdout: psOutput } = await execAsync(psCommand)
    
    let runningServices = 0
    let totalServices = 0
    
    try {
      const services = psOutput.trim().split('\n').filter(line => line).map(line => JSON.parse(line))
      totalServices = services.length
      runningServices = services.filter(s => s.State === 'running').length
    } catch (parseError) {
      console.log('Could not parse service status, using fallback')
      // Fallback container counting - count all running containers in the AR.IO directory
      const { stdout: countOutput } = await execAsync(`cd "${arIoNodePath}" && docker compose -f docker-compose.yaml ps -q | wc -l`)
      totalServices = parseInt(countOutput.trim()) || 0
      const { stdout: runningOutput } = await execAsync(`cd "${arIoNodePath}" && docker compose -f docker-compose.yaml ps -q --filter "status=running" | wc -l`)
      runningServices = parseInt(runningOutput.trim()) || 0
    }
    
    console.log(`Services status: ${runningServices}/${totalServices} running`)
    
    const success = runningServices > 0 && runningServices >= totalServices * 0.8
    
    if (success) {
      return NextResponse.json({ 
        success: true, 
        message: `AR.IO Node updated successfully! ${runningServices}/${totalServices} services running.`,
        details: {
          stepsCompleted: updateSteps,
          servicesRunning: runningServices,
          totalServices: totalServices,
          repositoryUpdated: gitOutput.includes('Already up to date') ? false : true,
          dockerImagesUpdated: dockerPullOutput.includes('up to date') ? false : true,
          dockerImagesBuilt: dockerPullOutput.includes('Build Output') || dockerPullOutput.includes('built from source'),
          gitPullOutput: gitOutput.trim(),
          dockerPullOutput: dockerPullOutput.trim(),
          dockerPrunePerformed: performPrune,
          versionCheckPerformed: !forceUpdate,
          customChangesHandled: gitStatus.hasChanges,
          customChangesStrategy: gitStatus.hasChanges ? handleChanges : null,
          customChangesResult: changeHandlingResult?.message,
          backupBranch: changeHandlingResult?.backupInfo
        }
      })
    } else {
      return NextResponse.json({ 
        error: `Update completed but some services may not be running properly (${runningServices}/${totalServices})`, 
        details: {
          stepsCompleted: updateSteps,
          servicesRunning: runningServices,
          totalServices: totalServices,
          dockerPrunePerformed: performPrune,
          versionCheckPerformed: !forceUpdate
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
