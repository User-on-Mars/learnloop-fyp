// Comprehensive diagnostic script
// Run with: node diagnose.js

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

console.log('🔍 LearnLoop Reflection Save Diagnostic\n');
console.log('=' .repeat(50));

// Check 1: Backend .env file
console.log('\n1️⃣ Checking Backend Configuration...');
const backendEnvPath = join(process.cwd(), 'backend', '.env');
if (existsSync(backendEnvPath)) {
  const envContent = readFileSync(backendEnvPath, 'utf-8');
  const hasMongoUri = envContent.includes('MONGODB_URI=');
  const hasJwtSecret = envContent.includes('JWT_SECRET=');
  const hasFirebaseProjectId = envContent.includes('FIREBASE_PROJECT_ID=');
  
  console.log('   ✅ backend/.env exists');
  console.log(`   ${hasMongoUri ? '✅' : '❌'} MONGODB_URI ${hasMongoUri ? 'found' : 'MISSING'}`);
  console.log(`   ${hasJwtSecret ? '✅' : '❌'} JWT_SECRET ${hasJwtSecret ? 'found' : 'MISSING'}`);
  console.log(`   ${hasFirebaseProjectId ? '✅' : '❌'} FIREBASE_PROJECT_ID ${hasFirebaseProjectId ? 'found' : 'MISSING'}`);
  
  if (!hasMongoUri || !hasJwtSecret || !hasFirebaseProjectId) {
    console.log('   ⚠️  Missing required environment variables!');
  }
} else {
  console.log('   ❌ backend/.env NOT FOUND');
  console.log('   ⚠️  Copy backend/.env.example to backend/.env');
}

// Check 2: Frontend .env file
console.log('\n2️⃣ Checking Frontend Configuration...');
const frontendEnvPath = join(process.cwd(), 'frontend', '.env');
if (existsSync(frontendEnvPath)) {
  const envContent = readFileSync(frontendEnvPath, 'utf-8');
  const hasApiUrl = envContent.includes('VITE_API_URL=');
  const hasFirebaseKey = envContent.includes('VITE_FIREBASE_API_KEY=');
  
  console.log('   ✅ frontend/.env exists');
  console.log(`   ${hasApiUrl ? '✅' : '❌'} VITE_API_URL ${hasApiUrl ? 'found' : 'MISSING'}`);
  console.log(`   ${hasFirebaseKey ? '✅' : '❌'} VITE_FIREBASE_API_KEY ${hasFirebaseKey ? 'found' : 'MISSING'}`);
  
  if (hasApiUrl) {
    const apiUrlMatch = envContent.match(/VITE_API_URL=(.+)/);
    if (apiUrlMatch) {
      const apiUrl = apiUrlMatch[1].trim();
      console.log(`   📍 API URL: ${apiUrl}`);
      if (!apiUrl.includes('localhost:4000')) {
        console.log('   ⚠️  API URL should be http://localhost:4000/api for local development');
      }
    }
  }
} else {
  console.log('   ❌ frontend/.env NOT FOUND');
  console.log('   ⚠️  Copy frontend/.env.example to frontend/.env');
}

// Check 3: Required files exist
console.log('\n3️⃣ Checking Required Files...');
const requiredFiles = [
  'backend/src/server.js',
  'backend/src/routes/reflections.js',
  'backend/src/controllers/reflectionController.js',
  'backend/src/models/Reflection.js',
  'backend/src/middleware/auth.js',
  'frontend/src/pages/ReflectPage.jsx',
  'frontend/src/services/api.js',
];

let allFilesExist = true;
for (const file of requiredFiles) {
  const filePath = join(process.cwd(), file);
  const exists = existsSync(filePath);
  console.log(`   ${exists ? '✅' : '❌'} ${file}`);
  if (!exists) allFilesExist = false;
}

if (!allFilesExist) {
  console.log('   ⚠️  Some required files are missing!');
}

// Check 4: Dependencies
console.log('\n4️⃣ Checking Dependencies...');
const backendPackagePath = join(process.cwd(), 'backend', 'package.json');
const frontendPackagePath = join(process.cwd(), 'frontend', 'package.json');

if (existsSync(backendPackagePath)) {
  const pkg = JSON.parse(readFileSync(backendPackagePath, 'utf-8'));
  const hasMongodb = pkg.dependencies?.mongoose;
  const hasExpress = pkg.dependencies?.express;
  const hasCors = pkg.dependencies?.cors;
  
  console.log('   Backend dependencies:');
  console.log(`   ${hasMongodb ? '✅' : '❌'} mongoose ${hasMongodb || 'MISSING'}`);
  console.log(`   ${hasExpress ? '✅' : '❌'} express ${hasExpress || 'MISSING'}`);
  console.log(`   ${hasCors ? '✅' : '❌'} cors ${hasCors || 'MISSING'}`);
} else {
  console.log('   ❌ backend/package.json NOT FOUND');
}

if (existsSync(frontendPackagePath)) {
  const pkg = JSON.parse(readFileSync(frontendPackagePath, 'utf-8'));
  const hasReact = pkg.dependencies?.react;
  const hasAxios = pkg.dependencies?.axios;
  const hasFirebase = pkg.dependencies?.firebase;
  
  console.log('   Frontend dependencies:');
  console.log(`   ${hasReact ? '✅' : '❌'} react ${hasReact || 'MISSING'}`);
  console.log(`   ${hasAxios ? '✅' : '❌'} axios ${hasAxios || 'MISSING'}`);
  console.log(`   ${hasFirebase ? '✅' : '❌'} firebase ${hasFirebase || 'MISSING'}`);
} else {
  console.log('   ❌ frontend/package.json NOT FOUND');
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('\n📋 SUMMARY\n');

console.log('Next Steps:');
console.log('1. Fix any ❌ issues above');
console.log('2. Install dependencies:');
console.log('   cd backend && npm install');
console.log('   cd frontend && npm install');
console.log('3. Start backend: cd backend && npm start');
console.log('4. Start frontend: cd frontend && npm run dev');
console.log('5. Follow steps in QUICK_FIX_STEPS.md');

console.log('\n💡 If all checks pass but reflections still don\'t save:');
console.log('   - Check browser console for errors (F12)');
console.log('   - Check backend terminal for errors');
console.log('   - Make sure you\'re logged in');
console.log('   - Try the test: node test-db-connection.js');

console.log('\n✅ Diagnostic complete!\n');
