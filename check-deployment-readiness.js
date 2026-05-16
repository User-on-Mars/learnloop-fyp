#!/usr/bin/env node

/**
 * Automated Deployment Readiness Check
 * Runs automated checks to verify the app is ready for deployment
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const checks = {
  passed: 0,
  failed: 0,
  warnings: 0,
  total: 0
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkPassed(message) {
  checks.passed++;
  checks.total++;
  log(`✅ ${message}`, 'green');
}

function checkFailed(message) {
  checks.failed++;
  checks.total++;
  log(`❌ ${message}`, 'red');
}

function checkWarning(message) {
  checks.warnings++;
  checks.total++;
  log(`⚠️  ${message}`, 'yellow');
}

function section(title) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(title, 'cyan');
  log('='.repeat(60), 'cyan');
}

// Check if file exists
function fileExists(filePath) {
  return fs.existsSync(path.join(__dirname, filePath));
}

// Read file content
function readFile(filePath) {
  try {
    return fs.readFileSync(path.join(__dirname, filePath), 'utf8');
  } catch (error) {
    return null;
  }
}

// Check environment variables
function checkEnvFile(envPath, envName) {
  section(`Checking ${envName}`);
  
  if (!fileExists(envPath)) {
    checkFailed(`${envPath} not found`);
    return;
  }
  
  checkPassed(`${envPath} exists`);
  
  const content = readFile(envPath);
  if (!content) {
    checkFailed(`Cannot read ${envPath}`);
    return;
  }
  
  // Check required variables
  const requiredVars = [
    'JWT_SECRET',
    'FIREBASE_PROJECT_ID',
    'MONGODB_URI'
  ];
  
  for (const varName of requiredVars) {
    if (content.includes(`${varName}=`) && !content.includes(`${varName}=\n`)) {
      checkPassed(`${varName} is set`);
      
      // Check JWT_SECRET length
      if (varName === 'JWT_SECRET') {
        const match = content.match(/JWT_SECRET=(.+)/);
        if (match && match[1].length >= 64) {
          checkPassed('JWT_SECRET is sufficiently long (64+ chars)');
        } else {
          checkWarning('JWT_SECRET should be at least 64 characters');
        }
      }
    } else {
      checkFailed(`${varName} is not set or empty`);
    }
  }
}

// Check .gitignore
function checkGitignore() {
  section('Checking .gitignore');
  
  if (!fileExists('.gitignore')) {
    checkFailed('.gitignore not found');
    return;
  }
  
  checkPassed('.gitignore exists');
  
  const content = readFile('.gitignore');
  const requiredEntries = [
    '.env',
    'node_modules',
    'dist',
    '.env.production'
  ];
  
  for (const entry of requiredEntries) {
    if (content.includes(entry)) {
      checkPassed(`${entry} is in .gitignore`);
    } else {
      checkWarning(`${entry} should be in .gitignore`);
    }
  }
  
  // Check for sensitive files
  if (content.includes('credentials') || content.includes('*credentials*')) {
    checkPassed('Credentials files are gitignored');
  } else {
    checkWarning('Consider adding credentials files to .gitignore');
  }
}

// Check package.json
function checkPackageJson() {
  section('Checking package.json');
  
  const backendPkg = path.join(__dirname, 'backend', 'package.json');
  const frontendPkg = path.join(__dirname, 'frontend', 'package.json');
  
  if (fileExists('backend/package.json')) {
    checkPassed('Backend package.json exists');
    
    const content = JSON.parse(readFile('backend/package.json'));
    if (content.scripts && content.scripts.test) {
      checkPassed('Backend has test script');
    } else {
      checkWarning('Backend missing test script');
    }
    
    if (content.dependencies) {
      const criticalDeps = ['express', 'mongoose', 'firebase-admin'];
      for (const dep of criticalDeps) {
        if (content.dependencies[dep]) {
          checkPassed(`Backend has ${dep}`);
        } else {
          checkFailed(`Backend missing ${dep}`);
        }
      }
    }
  } else {
    checkFailed('Backend package.json not found');
  }
  
  if (fileExists('frontend/package.json')) {
    checkPassed('Frontend package.json exists');
    
    const content = JSON.parse(readFile('frontend/package.json'));
    if (content.scripts && content.scripts.build) {
      checkPassed('Frontend has build script');
    } else {
      checkFailed('Frontend missing build script');
    }
  } else {
    checkFailed('Frontend package.json not found');
  }
}

// Check for sensitive files in repo
function checkSensitiveFiles() {
  section('Checking for Sensitive Files');
  
  const sensitivePatterns = [
    'backend/.env',
    'frontend/.env',
    '*credentials*',
    '*serviceAccount*',
    '*.pem',
    '*.key'
  ];
  
  // Check if files exist (they shouldn't be committed)
  const sensitiveFiles = [
    'backend/.env',
    'frontend/.env',
    'backend/credentials.json',
    'backend/serviceAccountKey.json'
  ];
  
  let foundSensitive = false;
  for (const file of sensitiveFiles) {
    if (fileExists(file)) {
      // Check if it's in .gitignore
      const gitignore = readFile('.gitignore');
      const fileName = path.basename(file);
      if (gitignore && gitignore.includes(fileName)) {
        checkPassed(`${file} exists but is gitignored`);
      } else {
        checkWarning(`${file} exists and may not be gitignored`);
        foundSensitive = true;
      }
    }
  }
  
  if (!foundSensitive) {
    checkPassed('No sensitive files found in repo');
  }
}

// Check Firebase configuration
function checkFirebaseConfig() {
  section('Checking Firebase Configuration');
  
  const firebaseConfigPath = 'backend/src/config/firebase.js';
  
  if (fileExists(firebaseConfigPath)) {
    checkPassed('Firebase config file exists');
    
    const content = readFile(firebaseConfigPath);
    if (content.includes('firebase-admin')) {
      checkPassed('Uses firebase-admin SDK');
    } else {
      checkFailed('Should use firebase-admin SDK');
    }
    
    if (content.includes('initializeApp')) {
      checkPassed('Firebase app is initialized');
    } else {
      checkFailed('Firebase app not initialized');
    }
  } else {
    checkFailed('Firebase config file not found');
  }
}

// Check for console.log in production code
function checkConsoleStatements() {
  section('Checking for Console Statements');
  
  try {
    const backendSrc = path.join(__dirname, 'backend', 'src');
    const frontendSrc = path.join(__dirname, 'frontend', 'src');
    
    // This is a simplified check - in real scenario, use grep or similar
    checkWarning('Manual check recommended: Search for console.log in src files');
    checkWarning('Run: grep -r "console.log" backend/src frontend/src');
  } catch (error) {
    checkWarning('Could not check for console statements');
  }
}

// Check Docker configuration
function checkDockerConfig() {
  section('Checking Docker Configuration');
  
  if (fileExists('docker-compose.production.yml')) {
    checkPassed('docker-compose.production.yml exists');
  } else {
    checkWarning('docker-compose.production.yml not found (optional)');
  }
  
  if (fileExists('backend/Dockerfile.production')) {
    checkPassed('Backend Dockerfile.production exists');
  } else {
    checkWarning('Backend Dockerfile.production not found (optional)');
  }
}

// Check documentation
function checkDocumentation() {
  section('Checking Documentation');
  
  const docs = [
    'README.md',
    'TESTING_AND_DEPLOYMENT_GUIDE.md',
    'PRE_DEPLOYMENT_CHECKLIST.md',
    'BUG_CHECK.md'
  ];
  
  for (const doc of docs) {
    if (fileExists(doc)) {
      checkPassed(`${doc} exists`);
    } else {
      checkWarning(`${doc} not found`);
    }
  }
}

// Main execution
async function main() {
  log('\n🚀 LearnLoop Deployment Readiness Check', 'blue');
  log('This script checks if your app is ready for deployment\n', 'blue');
  
  // Run all checks
  checkEnvFile('backend/.env', 'Development Environment');
  checkEnvFile('backend/.env.production', 'Production Environment');
  checkGitignore();
  checkPackageJson();
  checkSensitiveFiles();
  checkFirebaseConfig();
  checkConsoleStatements();
  checkDockerConfig();
  checkDocumentation();
  
  // Summary
  section('Summary');
  log(`Total Checks: ${checks.total}`, 'cyan');
  log(`✅ Passed: ${checks.passed}`, 'green');
  log(`❌ Failed: ${checks.failed}`, 'red');
  log(`⚠️  Warnings: ${checks.warnings}`, 'yellow');
  
  const passRate = ((checks.passed / checks.total) * 100).toFixed(1);
  log(`\nPass Rate: ${passRate}%`, 'cyan');
  
  if (checks.failed === 0 && checks.warnings === 0) {
    log('\n🎉 All checks passed! Your app is ready for deployment.', 'green');
    process.exit(0);
  } else if (checks.failed === 0) {
    log('\n⚠️  All critical checks passed, but there are warnings to review.', 'yellow');
    process.exit(0);
  } else {
    log('\n❌ Some checks failed. Please fix the issues before deploying.', 'red');
    process.exit(1);
  }
}

// Run the checks
main().catch(error => {
  log(`\n❌ Error running checks: ${error.message}`, 'red');
  process.exit(1);
});
