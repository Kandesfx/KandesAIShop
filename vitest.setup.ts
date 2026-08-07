import { config } from 'dotenv'

config({ path: '.env.test' })
config()

// Tránh readonly TS error trên `process.env.NODE_ENV` (Node types).
const envDefaults: Record<string, string> = {
  NODE_ENV: 'test',
  DATABASE_URL:
    'postgresql://kandes:kandes_test@localhost:5432/kandes_test?schema=public',
  APP_URL: 'http://localhost:3000',
  SESSION_SECRET: 'vitest-session-secret-do-not-use-in-production',
  ENCRYPTION_KEY:
    '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  EMAIL_PROVIDER: 'console',
  LOG_LEVEL: 'warn',
  SEPAY_BANK_CODE: 'VCB',
  SEPAY_ACCOUNT_NUMBER: '9999888877',
  SEPAY_ACCOUNT_NAME: 'TEST ACCOUNT',
  SEPAY_QR_TEMPLATE: 'compact2',
}

for (const [key, value] of Object.entries(envDefaults)) {
  if (process.env[key] === undefined || process.env[key] === '') {
    process.env[key] = value
  }
}
