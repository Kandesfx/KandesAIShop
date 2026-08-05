import crypto from 'crypto'
import { env } from './env'

/**
 * AES-256-GCM helper.
 * Dùng để mã hoá key/credentials ở rest theo ADR-008.
 *
 * Format ciphertext: [12 bytes IV][16 bytes auth tag][N bytes cipher]
 */

const ALGO = 'aes-256-gcm'
const IV_LEN = 12
const TAG_LEN = 16

function getKey(): Buffer {
  const key = Buffer.from(env.ENCRYPTION_KEY, 'hex')
  if (key.length !== 32) {
    throw new Error('ENCRYPTION_KEY không hợp lệ (cần 32 bytes hex = 64 ký tự)')
  }
  return key
}

/** Mã hoá plaintext UTF-8 thành Buffer (IV || TAG || CIPHER). */
export function encrypt(plaintext: string): Buffer {
  const iv = crypto.randomBytes(IV_LEN)
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv)
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, enc])
}

/** Giải mã ciphertext (IV || TAG || CIPHER) → plaintext UTF-8. */
export function decrypt(ciphertext: Buffer): string {
  if (ciphertext.length < IV_LEN + TAG_LEN) {
    throw new Error('Ciphertext không hợp lệ')
  }
  const iv = ciphertext.subarray(0, IV_LEN)
  const tag = ciphertext.subarray(IV_LEN, IV_LEN + TAG_LEN)
  const enc = ciphertext.subarray(IV_LEN + TAG_LEN)
  const decipher = crypto.createDecipheriv(ALGO, getKey(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8')
}

/**
 * Tạo fingerprint không lộ value gốc. Dùng để admin search trong kho
 * mà không tiết lộ key thật. SHA-256 + cắt 8 bytes đầu.
 */
export function fingerprint(plaintext: string): string {
  return crypto.createHash('sha256').update(plaintext).digest('hex').slice(0, 16)
}

/** Random secret an toàn (token, OTP). */
export function randomSecret(length = 32): string {
  return crypto.randomBytes(length).toString('hex')
}

/** OTP 6 số (dùng cho email/phone OTP). */
export function generateOtp(length = 6): string {
  const max = 10 ** length
  const n = crypto.randomInt(0, max)
  return n.toString().padStart(length, '0')
}

/** Hash OTP để lưu DB (không lưu plain OTP). */
export function hashOtp(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex')
}
