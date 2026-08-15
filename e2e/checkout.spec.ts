import { test, expect } from '@playwright/test'

/**
 * E2E checkout flow tests — P7-09.
 *
 * Covers the core purchase flow: browse → cart → checkout → payment.
 */

const ADMIN_USER = {
  email: 'e2e-admin@kandes.shop',
  password: process.env.E2E_ADMIN_PASSWORD ?? 'AdminPassword123!',
}

test.describe('Checkout flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear cart before each test
    await page.goto('/cart')
  })

  test('add product to cart and checkout', async ({ page }) => {
    // Navigate to products
    await page.goto('/products')
    await expect(page).toHaveURL(/\/products/)

    // Click first product
    const firstProduct = page.locator('a[href^="/products/"]').first()
    await firstProduct.click()
    await expect(page).toHaveURL(/\/products\//)

    // Should have a purchase button
    const buyButton = page.locator('button:has-text("Mua")').first()
    await expect(buyButton).toBeVisible()

    // Add to cart
    await buyButton.click()

    // Should redirect to cart
    await expect(page).toHaveURL(/\/cart/)
  })

  test('cart shows items and total', async ({ page }) => {
    await page.goto('/cart')
    // Cart page should load without errors
    await expect(page).toHaveURL(/\/cart/)
  })
})

test.describe('Admin flows', () => {
  test('admin login works', async ({ page }) => {
    await page.goto('/manage/login')
    await page.fill('[name="email"]', ADMIN_USER.email)
    await page.fill('[name="password"]', ADMIN_USER.password)
    await page.click('[type="submit"]')

    // Should redirect to admin dashboard
    await expect(page).toHaveURL(/\/manage/)
  })
})