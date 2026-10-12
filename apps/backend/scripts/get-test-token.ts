import dotenv from 'dotenv';
import path from 'node:path';
import fs from 'node:fs';

// Load .env
const envCandidatePaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'apps/backend/.env'),
  path.resolve(process.cwd(), '..', '.env'),
  path.resolve(process.cwd(), '..', '..', '.env'),
];

for (const envPath of envCandidatePaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const email = args[0];
  const password = args[1];

  if (!email || !password) {
    console.error('Usage: npm run token <email> <password>');
    console.error('Example: npm run token test@krishiva.com password123');
    process.exit(1);
  }

  const apiKey = process.env.FIREBASE_WEB_API_KEY;
  if (!apiKey || apiKey === 'your-firebase-web-api-key') {
    console.error(
      'Error: FIREBASE_WEB_API_KEY is not set or still has placeholder value in .env.'
    );
    console.error(
      'Please obtain your Web API Key from Firebase Console (Project Settings > General > Web API Key) and set FIREBASE_WEB_API_KEY in .env.'
    );
    process.exit(1);
  }

  // Attempt sign in first
  try {
    const signInUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;
    const signInRes = await fetch(signInUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: true,
      }),
    });

    const signInData = (await signInRes.json()) as any;

    if (signInRes.ok && signInData.idToken) {
      console.log(signInData.idToken);
      return;
    }

    // If user does not exist, attempt sign up
    const isUserNotFound =
      signInData?.error?.message === 'EMAIL_NOT_FOUND' ||
      signInData?.error?.message?.includes('NOT_FOUND');

    if (isUserNotFound) {
      const signUpUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`;
      const signUpRes = await fetch(signUpUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          returnSecureToken: true,
        }),
      });

      const signUpData = (await signUpRes.json()) as any;

      if (signUpRes.ok && signUpData.idToken) {
        console.log(signUpData.idToken);
        return;
      }

      console.error(
        `Failed to sign up test user: ${signUpData?.error?.message || 'Unknown error'}`
      );
      process.exit(1);
    }

    console.error(
      `Failed to authenticate test user: ${signInData?.error?.message || 'Unknown error'}`
    );
    process.exit(1);
  } catch (err: any) {
    console.error(`Network error requesting test token: ${err?.message || err}`);
    process.exit(1);
  }
}

main();
