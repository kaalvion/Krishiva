export interface EnvConfig {
  apiUrl: string;
  firebaseApiKey: string;
  firebaseAuthDomain: string;
  firebaseProjectId: string;
  firebaseStorageBucket: string;
  firebaseMessagingSenderId: string;
  firebaseAppId: string;
}

export function getMissingEnvVars(): string[] {
  const missing: string[] = [];
  if (!process.env.EXPO_PUBLIC_API_URL) missing.push('EXPO_PUBLIC_API_URL');
  if (!process.env.EXPO_PUBLIC_FIREBASE_API_KEY) missing.push('EXPO_PUBLIC_FIREBASE_API_KEY');
  if (!process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN) missing.push('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN');
  if (!process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID) missing.push('EXPO_PUBLIC_FIREBASE_PROJECT_ID');
  if (!process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET) missing.push('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET');
  if (!process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID) missing.push('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID');
  if (!process.env.EXPO_PUBLIC_FIREBASE_APP_ID) missing.push('EXPO_PUBLIC_FIREBASE_APP_ID');
  return missing;
}

export const env: EnvConfig = {
  apiUrl: process.env.EXPO_PUBLIC_API_URL ?? '',
  firebaseApiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
  firebaseAuthDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  firebaseProjectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  firebaseStorageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
  firebaseMessagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  firebaseAppId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
};
