import { db } from '../../lib/db'
import { logger } from '../../lib/logger'
import { generateOtp, hashOtp } from '../../lib/encryption'
import { sendEmail, otpEmail } from '../../lib/email'
import { RateLimitError, ValidationError, NotFoundError } from '../../lib/errors'
import { rateLimitOrThrow, rateLimitKey } from '../../lib/rate-limit'
import type { OtpContactType, OtpPurpose } from '@prisma/client'

/**
 * OTP module — Phase 2.
 *
 * Spec P2-02:
 *   - Request OTP: rate-limit 5/min/IP, 10/day/contact
 *   - Verify OTP: max 5 attempts, code hết hạn 10 phút
 *   - Resend sau 60s (chống spam)
 *   - Console provider trong dev
 *
 * Lưu DB:
 *   - OtpToken: codeHash (sha256), attempts counter, expiresAt, consumedAt
 *
 * Purpose nào dùng được:
 *   - login:        login bằng OTP (alternative to password)
 *   - register:     verify email khi đăng ký
 *   - verify:       verify email sau này
 *   - reset_password: dùng khi user không nhớ pass (alternative flow)
 *   - reveal_key:   reveal inventory key (Phase 3+)
 */

const OTP_TTL_MS = 10 * 60 * 1000 // 10 phút
const RESEND_COOLDOWN_MS = 60 * 1000 // 60s
const MAX_ATTEMPTS = 5

export type RequestOtpInput = {
  contactType: OtpContactType
  contactValue: string
  purpose: OtpPurpose
  ipAddress?: string
}

export type RequestOtpResult = {
  /** Có gửi OTP thật không — false khi rate-limited, email không tồn tại (anti-enum). */
  sent: boolean
  /** Resend available sau thời điểm này. Null nếu vừa gửi xong. */
  nextResendAt: Date | null
  expiresAt: Date
}

export type VerifyOtpInput = {
  contactType: OtpContactType
  contactValue: string
  code: string
  purpose: OtpPurpose
}

export type VerifyOtpResult = {
  valid: boolean
  attemptsRemaining: number
}

function emailKey(email: string): string {
  return email.trim().toLowerCase()
}

function phoneKey(phone: string): string {
  return phone.replace(/\D/g, '')
}

export const otpService = {
  /**
   * Request OTP.
   *
   * - 5/min/IP (qua rateLimitOrThrow)
   * - 10/day/contact (qua rateLimitOrThrow)
   * - Resend cooldown 60s
   * - Always return success (kể cả email không tồn tại) chống enumeration
   */
  async request(input: RequestOtpInput): Promise<RequestOtpResult> {
    // Rate limit per-IP
    await rateLimitOrThrow(rateLimitKey('otp:request', input.ipAddress), 5, 60 * 1000)

    const contactValue =
      input.contactType === 'email' ? emailKey(input.contactValue) : phoneKey(input.contactValue)

    if (input.contactType === 'email' && !contactValue.includes('@')) {
      throw new ValidationError('Email không hợp lệ')
    }

    // Rate limit per-contact (10/day)
    await rateLimitOrThrow(
      rateLimitKey('otp:contact', input.contactType + ':' + contactValue),
      10,
      24 * 60 * 60 * 1000
    )

    // Resend cooldown — check OTP chưa consume gần nhất
    const recent = await db.otpToken.findFirst({
      where: {
        contactType: input.contactType,
        contactValue,
        purpose: input.purpose,
        consumedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    })

    const now = new Date()
    if (recent && recent.expiresAt > now) {
      // Còn hạn → resend cooldown?
      const cooldownEnd = new Date(recent.createdAt.getTime() + RESEND_COOLDOWN_MS)
      if (now < cooldownEnd) {
        // Trả cooldown thay vì tạo token mới
        return {
          sent: false,
          nextResendAt: cooldownEnd,
          expiresAt: recent.expiresAt,
        }
      }
    }

    const code = generateOtp(6)
    const codeHash = hashOtp(code)
    const expiresAt = new Date(Date.now() + OTP_TTL_MS)

    await db.otpToken.create({
      data: {
        contactType: input.contactType,
        contactValue,
        codeHash,
        purpose: input.purpose,
        expiresAt,
        maxAttempts: MAX_ATTEMPTS,
      },
    })

    // Gửi email/SMS — Phase 2 chỉ hỗ trợ email qua console
    if (input.contactType === 'email') {
      const tpl = otpEmail(code, input.purpose as 'login' | 'register' | 'verify' | 'reset')
      try {
        await sendEmail({ to: contactValue, subject: tpl.subject, html: tpl.html, text: tpl.text })
      } catch (err) {
        logger.error({ err, contactValue }, 'Failed to send OTP email')
        // Không throw — user experience: vẫn coi như đã gửi
        // Console provider luôn OK, nhưng defensive cho provider khác.
      }
    } else {
      // SMS chưa implement trong Phase 2
      logger.warn(
        { contactValue, code },
        'OTP requested via SMS — chưa implement, in ra log để dev test'
      )
    }

    logger.info(
      {
        contactType: input.contactType,
        contactValue: contactValue.slice(0, 3) + '***',
        purpose: input.purpose,
        expiresAt,
      },
      'OTP requested'
    )

    return {
      sent: true,
      nextResendAt: new Date(now.getTime() + RESEND_COOLDOWN_MS),
      expiresAt,
    }
  },

  /**
   * Verify OTP code. Trả true nếu đúng, throw nếu attempts quá hoặc hết hạn.
   * Sai code tăng attempts; sau MAX_ATTEMPTS lần sai → token bị "đóng băng".
   */
  async verify(input: VerifyOtpInput): Promise<VerifyOtpResult> {
    const contactValue =
      input.contactType === 'email' ? emailKey(input.contactValue) : phoneKey(input.contactValue)

    const token = await db.otpToken.findFirst({
      where: {
        contactType: input.contactType,
        contactValue,
        purpose: input.purpose,
        consumedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!token) {
      throw new NotFoundError('Mã OTP không tồn tại hoặc đã được sử dụng')
    }

    const now = new Date()
    if (token.expiresAt < now) {
      throw new ValidationError('Mã OTP đã hết hạn')
    }

    if (token.attempts >= token.maxAttempts) {
      throw new RateLimitError('Đã nhập sai quá số lần cho phép, vui lòng yêu cầu mã mới')
    }

    const inputHash = hashOtp(input.code)
    if (inputHash !== token.codeHash) {
      // Tăng attempts
      await db.otpToken.update({
        where: { id: token.id },
        data: { attempts: token.attempts + 1 },
      })
      const remaining = token.maxAttempts - token.attempts - 1
      logger.warn(
        {
          contactType: input.contactType,
          contactValue: contactValue.slice(0, 3) + '***',
          purpose: input.purpose,
          attempts: token.attempts + 1,
        },
        'OTP verify failed'
      )
      return { valid: false, attemptsRemaining: remaining }
    }

    // Đúng code → consume
    await db.otpToken.update({
      where: { id: token.id },
      data: { consumedAt: now },
    })

    return { valid: true, attemptsRemaining: token.maxAttempts }
  },
}

export const __test = { emailKey, phoneKey }
