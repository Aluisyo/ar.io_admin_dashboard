#!/usr/bin/env node

const { exec } = require('child_process');
const { promisify } = require('util');
const { join } = require('path');
const { existsSync, mkdirSync } = require('fs');
const { access, constants } = require('fs').promises;

const execAsync = promisify(exec);

async function testBackup() {
  try {
    const arIoNodePath = process.env.AR_IO_NODE_PATH || '/tmp/ar-io-node';
    const timestamp = new Date().toISOString().replace(/[:.-]/g, '_');
    const backupFileName = `config_backup_${timestamp}.tar.gz`;
    
    // Use a writable directory for backups (user's home directory)
    const userBackupDir = join(process.env.HOME || '/tmp', 'ar-io-backups');
    const backupFilePath = join(userBackupDir, backupFileName);

    console.log('Testing backup functionality...');
    console.log('AR.IO Node Path:', arIoNodePath);
    console.log('Backup Directory:', userBackupDir);
    console.log('Backup File:', backupFilePath);

    // Create backup directory with proper permissions
    if (!existsSync(userBackupDir)) {
      mkdirSync(userBackupDir, { recursive: true, mode: 0o755 });
      console.log('Created backup directory');
    }

    // Verify we can write to the backup directory
    try {
      await access(userBackupDir, constants.W_OK);
      console.log('✓ Backup directory is writable');
    } catch (permError) {
      console.error('✗ Cannot write to backup directory:', permError);
      return;
    }

    // Find all .env files
    const findCommand = `find "${arIoNodePath}" -maxdepth 1 -name "*.env*" -type f`;
    console.log('Finding .env files...');
    const { stdout: envFiles } = await execAsync(findCommand);
    
    if (!envFiles.trim()) {
      console.log('✗ No .env files found to backup');
      return;
    }

    // Create the backup with better error handling
    const envFilesList = envFiles.trim().split('\n').map(f => f.trim()).filter(f => f);
    console.log('✓ Found files to backup:', envFilesList);
    
    // Use a more robust tar command
    const tarCommand = `tar -czf "${backupFilePath}" -C "${arIoNodePath}" ${envFilesList.map(f => `"${f.replace(arIoNodePath + '/', '')}"`).join(' ')}`;
    console.log('Running backup command...');
    
    await execAsync(tarCommand);

    // Verify the backup was created
    if (!existsSync(backupFilePath)) {
      throw new Error('Backup file was not created');
    }

    // Get backup file size for confirmation
    const { stdout: sizeOutput } = await execAsync(`ls -lh "${backupFilePath}" | awk '{print $5}'`);
    const fileSize = sizeOutput.trim();

    console.log('✓ Backup created successfully!');
    console.log('Backup details:');
    console.log('- Path:', backupFilePath);
    console.log('- Size:', fileSize);
    console.log('- Files backed up:', envFilesList.length);
    console.log('- Timestamp:', new Date().toISOString());

    // List contents of backup to verify
    console.log('\nBackup contents:');
    const { stdout: contents } = await execAsync(`tar -tzf "${backupFilePath}"`);
    console.log(contents);

  } catch (error) {
    console.error('✗ Error during backup test:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Details:', errorMessage);
  }
}

testBackup();
