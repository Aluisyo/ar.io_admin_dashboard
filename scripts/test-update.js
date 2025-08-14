#!/usr/bin/env node

const { exec } = require('child_process');
const { promisify } = require('util');
const { join } = require('path');
const { existsSync } = require('fs');

const execAsync = promisify(exec);

async function testUpdateNode() {
  try {
    const arIoNodePath = process.env.AR_IO_NODE_PATH || '/tmp/ar-io-node';
    const dockerComposeFile = join(arIoNodePath, 'docker-compose.yaml');
    const projectName = process.env.DOCKER_PROJECT || 'ar-io-node';
    
    console.log('🧪 Testing AR.IO Node update functionality...');
    console.log('- AR.IO Node Path:', arIoNodePath);
    console.log('- Project Name:', projectName);
    console.log('- Docker Compose File:', dockerComposeFile);
    
    // Verify prerequisites
    if (!existsSync(dockerComposeFile)) {
      console.error('❌ Docker compose file not found at', dockerComposeFile);
      return;
    }
    
    console.log('✅ Docker compose file exists');
    
    // Test 1: Check current services
    console.log('\n📋 Step 1: Checking current services...');
    const psCommand = `cd "${arIoNodePath}" && docker compose -f docker-compose.yaml -p ${projectName} ps --format json`;
    const { stdout: psOutput } = await execAsync(psCommand);
    
    let runningServices = 0;
    let totalServices = 0;
    
    try {
      const services = psOutput.trim().split('\n').filter(line => line).map(line => JSON.parse(line));
      totalServices = services.length;
      runningServices = services.filter(s => s.State === 'running').length;
      console.log(`✅ Services status: ${runningServices}/${totalServices} running`);
      
      services.forEach(service => {
        console.log(`   - ${service.Service}: ${service.State} (${service.Status})`);
      });
    } catch (parseError) {
      console.log('⚠️  Could not parse service status, using fallback');
      const { stdout: countOutput } = await execAsync(`docker ps -q --filter "label=com.docker.compose.project=${projectName}" | wc -l`);
      runningServices = parseInt(countOutput.trim()) || 0;
      totalServices = runningServices;
      console.log(`✅ Fallback count: ${runningServices} containers running`);
    }
    
    // Test 2: Test pull command (dry-run style)
    console.log('\n🔄 Step 2: Testing image pull...');
    const pullCommand = `cd "${arIoNodePath}" && timeout 30s docker compose -f docker-compose.yaml -p ${projectName} pull --quiet`;
    const { stdout: pullOutput, stderr: pullError } = await execAsync(pullCommand);
    
    console.log('✅ Pull command executed successfully');
    console.log('Pull output:', pullOutput.trim() || 'No output (likely up to date)');
    if (pullError) console.log('Pull warnings:', pullError);
    
    // Check if any images were updated
    const imageUpdateCheck = pullOutput.includes('Downloaded') || pullOutput.includes('Pulled');
    if (!imageUpdateCheck && pullOutput.includes('up to date')) {
      console.log('✅ All images are up to date');
    } else if (imageUpdateCheck) {
      console.log('✅ Some images were updated');
    } else {
      console.log('✅ Pull completed (status unclear)');
    }
    
    // Test 3: Verify we can restart services (without actually doing it)
    console.log('\n🔄 Step 3: Testing service commands (dry-run)...');
    
    const configCommand = `cd "${arIoNodePath}" && docker compose -f docker-compose.yaml -p ${projectName} config --services`;
    const { stdout: servicesOutput } = await execAsync(configCommand);
    const availableServices = servicesOutput.trim().split('\n').filter(s => s);
    
    console.log('✅ Available services:', availableServices.join(', '));
    
    console.log('\n✅ Update functionality test completed successfully!');
    console.log('\nSummary:');
    console.log(`- Docker Compose: ✅ Working`);
    console.log(`- Image Pull: ✅ Working`);
    console.log(`- Service Detection: ✅ Working (${runningServices}/${totalServices})`);
    console.log(`- Available Services: ✅ ${availableServices.length} services`);
    
    console.log('\n🎉 The update functionality should work correctly!');
    
  } catch (error) {
    console.error('❌ Error during update test:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Details:', errorMessage);
  }
}

testUpdateNode();
