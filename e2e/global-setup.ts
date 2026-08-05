import { chromium, FullConfig } from '@playwright/test'

/**
 * Global setup: authenticate test users before all tests.
 * Creates a test user + admin user in DB via seed script or direct API.
 */
export default async function globalSetup(config: FullConfig) {
  // Ensure test users exist (dev environment)
  const baseUrl = config.projects[0]?.use?.baseURL ?? 'http://localhost:3000'

  // Create test user if not exists
  await createTestUser(baseUrl, {
    email: 'e2e-test@kandes.shop',
    password: process.env.E2E_TEST_PASSWORD ?? 'TestPassword123!',
    name: 'E2E Test User',
  })

  // Create admin user if not exists
  await createTestUser(baseUrl, {
    email: 'e2e-admin@kandes.shop',
    password: process.env.E2E_ADMIN_PASSWORD ?? 'AdminPassword123!',
    name: 'E2E Admin',
    role: 'admin',
  })
}

async function createTestUser(
  baseUrl: string,
  user: { email: string; password: string; name: string; role?: string }
): Promise<void> {
  try {
    await fetch(`${baseUrl}/api/e2e/setup-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    })
  } catch {
    // User likely already exists — ignore
  }
}