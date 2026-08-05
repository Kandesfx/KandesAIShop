import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

/**
 * GET /api/auth/oauth/google/callback
 *
 * Stub cho OAuth redirect flow (alternative to One Tap).
 *
 * Phase 2 hiện dùng Google One Tap (idToken từ client gửi lên
 * /api/auth/oauth/google). Callback route này để:
 *   - Tương lai hỗ trợ OAuth redirect (server-side flow)
 *   - Tránh 404 nếu Google Console trỏ nhầm URL
 *
 * Khi nào implement đầy đủ:
 *   1. Nhận `code` từ Google redirect
 *   2. Exchange code lấy id_token + access_token
 *   3. Gọi oauthService.loginWithGoogle với id_token
 *   4. Set cookies + redirect về frontend
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const error = url.searchParams.get('error')

  logger.warn(
    { code: !!code, error, url: req.url },
    'Google OAuth callback hit — chưa implement đầy đủ, dùng One Tap flow'
  )

  if (error) {
    return NextResponse.redirect(new URL(`/auth/login?error=${encodeURIComponent(error)}`, req.url))
  }

  return NextResponse.redirect(new URL('/auth/login?error=oauth_not_implemented', req.url))
}
