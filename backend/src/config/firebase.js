import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Initialize Firebase Admin SDK for server-side token verification.
 * Uses service account file or environment variables.
 */
let firebaseApp;

try {
  // Try to load service account from file first
  const serviceAccountPath = join(__dirname, '..', '..', 'firebase-service-account.json');
  try {
    console.log('🔧 Attempting to load Firebase service account from file...');
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
    console.log('🔧 Service account loaded, project_id:', serviceAccount.project_id);
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id
    });
    console.log('✅ Firebase Admin SDK initialized with service account file');
  } catch (fileError) {
    // If file doesn't exist, try environment variable
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      console.log('🔧 Attempting to initialize Firebase with service account key from env...');
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      console.log('🔧 Service account parsed, project_id:', serviceAccount.project_id);
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id
      });
      console.log('✅ Firebase Admin SDK initialized with service account from env');
    } else if (process.env.FIREBASE_PROJECT_ID) {
      console.log('🔧 Attempting to initialize Firebase with project ID only...');
      // Minimal initialization with just project ID (works for token verification)
      firebaseApp = admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID
      });
      console.log('✅ Firebase Admin SDK initialized with project ID');
    } else {
      console.log('🔧 Attempting to initialize Firebase with default credentials...');
      // Fallback: try default credentials
      firebaseApp = admin.initializeApp();
      console.log('✅ Firebase Admin SDK initialized with default credentials');
    }
  }
} catch (error) {
  console.error('❌ Firebase Admin SDK initialization failed:', error.message);
  console.error('   Full error:', error);
  console.warn('   Token verification will fall back to manual decode (less secure)');
  firebaseApp = null;
}

export { firebaseApp };
export default admin;
