import admin from 'firebase-admin';

/**
 * Initialize Firebase Admin SDK for server-side token verification.
 * Uses Application Default Credentials or FIREBASE_PROJECT_ID env var.
 */
let firebaseApp;

try {
  // If a service account key file is provided, use it
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id
    });
  } else if (process.env.FIREBASE_PROJECT_ID) {
    // Minimal initialization with just project ID (works for token verification)
    firebaseApp = admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID
    });
  } else {
    // Fallback: try default credentials
    firebaseApp = admin.initializeApp();
  }
  console.log('✅ Firebase Admin SDK initialized');
} catch (error) {
  console.warn('⚠️ Firebase Admin SDK initialization failed:', error.message);
  console.warn('   Token verification will fall back to manual decode (less secure)');
  firebaseApp = null;
}

export { firebaseApp };
export default admin;
