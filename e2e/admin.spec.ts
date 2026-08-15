import { test, expect } from '@playwright/test'

/**
 * E2E admin tests — P7-09.
 */

const ADMIN_USER = {
  email: 'e2e-admin@kandes.shop',
  password: process.env.E2E_ADMIN_PASSWORD ?? 'AdminPassword123!',
}

test.describe('Admin panel', () => {
  test('admin login redirects to dashboard', async ({ page }) => {
    await page.goto('/manage/login')
    await page.fill('[name="email"]', ADMIN_USER.email)
    await page.fill('[name="password"]', ADMIN_USER.password)
    await page.click('[type="submit"]')

    await expect(page).toHaveURL(/\/admin\//)
  })

  test('unauthenticated /admin redirects to login', async ({ page }) => {
    await page.goto('/manage/')
    await expect(page).toHaveURL(/\/admin\/login/)
  })

  test('health check page loads', async ({ page }) => {
    await page.goto('/manage/health')
    await expect(page).toHaveURL(/\/admin\/login/) // Should redirect to login first
  })
})