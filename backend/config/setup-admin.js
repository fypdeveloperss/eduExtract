#!/usr/bin/env node

/**
 * Admin Setup Helper Script
 * 
 * This script helps you set up your first admin user by getting
 * your Firebase UID and showing you exactly what to do.
 */

const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\n🚀 EduExtract Admin Setup Helper\n');
console.log('This script will help you set up your first admin user.\n');

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  try {
    console.log('📋 Step 1: Get your Firebase UID');
    console.log('   1. Open your EduExtract application in a browser');
    console.log('   2. Register/Login with your account');
    console.log('   3. Open Developer Tools (F12)');
    console.log('   4. Go to Console tab');
    console.log('   5. Run: getCurrentUserUid()');
    console.log('   6. Copy the UID that appears\n');

    const uid = await question('Enter your Firebase UID: ');
    
    if (!uid || uid.trim().length < 10) {
      console.log('❌ Invalid UID. Please make sure you copied it correctly.');
      process.exit(1);
    }

    const cleanUid = uid.trim();
    
    console.log('\n📝 Step 2: Update the configuration file');
    
    const configPath = path.join(__dirname, 'firebase-admin.js');
    
    if (!fs.existsSync(configPath)) {
      console.log('❌ Could not find firebase-admin.js file.');
      console.log('   Make sure you are running this from the backend/config directory.');
      process.exit(1);
    }

    let configContent = fs.readFileSync(configPath, 'utf8');
    
    // Check if UID is already in the file
    if (configContent.includes(cleanUid)) {
      console.log('✅ This UID is already in the admin list!');
    } else {
      // Add the UID to the ADMIN_UIDS array
      const uidPattern = /(const ADMIN_UIDS = \[\s*)/;
      const match = configContent.match(uidPattern);
      
      if (match) {
        const replacement = `$1'${cleanUid}',\n  `;
        configContent = configContent.replace(uidPattern, replacement);
        
        // Create backup
        fs.writeFileSync(configPath + '.backup', fs.readFileSync(configPath));
        
        // Write updated config
        fs.writeFileSync(configPath, configContent);
        
        console.log('✅ Successfully added your UID to the admin list!');
        console.log('   (Backup created as firebase-admin.js.backup)');
      } else {
        console.log('❌ Could not find ADMIN_UIDS array in the config file.');
        console.log('   Please add this manually:');
        console.log(`   '${cleanUid}',`);
        process.exit(1);
      }
    }

    console.log('\n🚀 Step 3: Start/Restart your backend server');
    console.log('   1. Stop your backend server (Ctrl+C if running)');
    console.log('   2. Run: npm start');
    console.log('   3. Wait for "MongoDB connected successfully"');
    
    console.log('\n🎉 Step 4: Test your admin access');
    console.log('   1. Open your application');
    console.log('   2. Login with your account');
    console.log('   3. Look for the "Admin" button in the header');
    console.log('   4. Click it to access the admin dashboard');
    
    console.log('\n🆕 Step 5: Use the modern admin management');
    console.log('   1. Go to Admin Dashboard → Admin Management');
    console.log('   2. Add more admins by email (no more UID copying!)');
    console.log('   3. Manage roles and permissions');
    
    console.log('\n✨ You are now ready to use the modern admin system!');
    console.log('   No more manual UID editing needed for future admins.\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

main();
