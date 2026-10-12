import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'node:path';
import fs from 'node:fs';

// Look for .env file in multiple common locations (cwd, backend dir, or monorepo root)
const envCandidatePaths = [
  process.env.DOTENV_CONFIG_PATH,
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'apps/backend/.env'),
  path.resolve(process.cwd(), '..', '.env'),
  path.resolve(process.cwd(), '..', '..', '.env'),
].filter((p): p is string => Boolean(p));

for (const envPath of envCandidatePaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  FIREBASE_SERVICE_ACCOUNT_PATH: z
    .string({ required_error: 'FIREBASE_SERVICE_ACCOUNT_PATH is required' })
    .min(1, 'FIREBASE_SERVICE_ACCOUNT_PATH cannot be empty'),
  EMQX_HOST: z
    .string({ required_error: 'EMQX_HOST is required' })
    .min(1, 'EMQX_HOST cannot be empty'),
  EMQX_PORT: z.coerce.number().default(8883),
  EMQX_USERNAME: z
    .string({ required_error: 'EMQX_USERNAME is required' })
    .min(1, 'EMQX_USERNAME cannot be empty'),
  EMQX_PASSWORD: z
    .string({ required_error: 'EMQX_PASSWORD is required' })
    .min(1, 'EMQX_PASSWORD cannot be empty'),
  MQTT_CLIENT_ID_PREFIX: z.string().default('krishiva-backend'),
  CORS_ORIGINS: z.string().default('*'),
  FIREBASE_WEB_API_KEY: z.string().optional(),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error('\n=============================================================');
  console.error('❌ Environment configuration error! Missing or invalid vars:');
  for (const issue of result.error.issues) {
    console.error(` - [${issue.path.join('.')}] ${issue.message}`);
  }
  console.error('=============================================================\n');
  process.exit(1);
}

export const env = result.data;
export type Env = typeof env;
