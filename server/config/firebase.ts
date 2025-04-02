import * as admin from 'firebase-admin';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

if (!serviceAccountPath) {
  throw new Error('FIREBASE_SERVICE_ACCOUNT_PATH is not defined in environment variables');
}

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(path.resolve(serviceAccountPath))
});

export default admin;