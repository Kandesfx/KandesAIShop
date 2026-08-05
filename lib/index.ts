/**
 * Barrel export cho lib/. Cẩn thận import bloat — chỉ import khi cần nhiều helpers.
 */
export { cn } from './utils'
export {
  formatVND,
  formatVnd,
  formatNumber,
  formatDate,
  slugify,
  maskSecret,
  DELIVERY_LABELS,
  STOCK_LABELS,
  DELIVERY_BADGE_CLASS,
} from './format'
export {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  OutOfStockError,
  RateLimitError,
  PaymentError,
} from './errors'
export { ok, fail, parseInput, getClientIp, withShortCache } from './http'
export { jsonReplacer, serialize } from './serialize'
export { logger, loggerWithContext, logError } from './logger'
export { api, ApiError } from './api-client'
export {
  getCurrentUser,
  getOptionalUser,
  requireUser,
  requireRole,
  getCurrentSessionId,
} from './auth'
export { hashPassword, verifyPassword, validatePassword, PasswordValidationError } from './password'
export { encrypt, decrypt, fingerprint, randomSecret, generateOtp, hashOtp } from './encryption'
