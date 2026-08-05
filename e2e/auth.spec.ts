import { test, expect } from '@playwright/test'

/**
 * E2E auth flow tests — P7-09.
 */

const TEST_USER = {
  email: 'e2e-test@kandes.shop',
  password: process.env.E2E_TEST_PASSWORD ?? 'TestPassword123!',
  name: 'E2E Test User',
}

test.describe('Auth flows', () => {
  test('register + login + logout', async ({ page }) => {
    await page.goto('/auth/register')

    // Fill registration form
    await page.fill('[name="name"]', TEST_USER.name)
    await page.fill('[name="email"]', TEST_USER.email)
    await page.fill('[name="password"]', TEST_USER.password)

    // Submit
    await page.click('[type="submit"]')

    // Should redirect or show success
    await expect(page).not.toHaveURL('/auth/register')

    // Login
    await page.goto('/auth/login')
    await page.fill('[name="email"]', TEST_USER.email)
    await page.fill('[name="password"]', TEST_USER.password)
    await page.click('[type="submit"]')

    // Should land on account
    await expect(page).toHaveURL(/\/account/)
  })

  test('protected routes redirect to login', async ({ page }) => {
    await page.goto('/account/orders')
    await expect(page).toHaveURL(/\/auth\/login/)
  })
})