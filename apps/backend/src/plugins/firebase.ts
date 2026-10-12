import admin from 'firebase-admin';
import fs from 'node:fs';
import path from 'node:path';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

let appInstance: admin.app.App | null = null;

export function initFirebase(): admin.app.App {
  if (appInstance) {
    return appInstance;
  }

  // Resolve service account path robustly
  const candidatePaths = [
    path.resolve(process.cwd(), env.FIREBASE_SERVICE_ACCOUNT_PATH),
    path.resolve(env.FIREBASE_SERVICE_ACCOUNT_PATH),
    path.resolve(process.cwd(), 'secrets/firebase-admin.json'),
    path.resolve(process.cwd(), '../../secrets/firebase-admin.json'),
    path.resolve(process.cwd(), '../secrets/firebase-admin.json'),
  ];

  const resolvedPath = candidatePaths.find((p) => fs.existsSync(p));

  if (!resolvedPath) {
    throw new Error(
      `Firebase service account key file not found. Configured path: "${env.FIREBASE_SERVICE_ACCOUNT_PATH}". Checked paths: ${candidatePaths.join(', ')}`
    );
  }

  const serviceAccount = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));

  appInstance = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  logger.info('Firebase Admin SDK initialized');
  return appInstance;
}

export const firestore = (): admin.firestore.Firestore => {
  if (!appInstance) {
    initFirebase();
  }
  return admin.firestore();
};

export const auth = (): admin.auth.Auth => {
  if (!appInstance) {
    initFirebase();
  }
  return admin.auth();
};

export default {
  initFirebase,
  firestore,
  auth,
};
