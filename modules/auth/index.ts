export { authService } from './service'
export type { AuthSuccess, AuthMeta, PublicUser } from './service'
export { otpService } from './otp'
export type { RequestOtpResult, VerifyOtpResult } from './otp'
export { oauthService } from './oauth'
export type { GoogleTokenPayload, OAuthResult } from './oauth'
export {
  createSession,
  rotateSession,
  revokeSession,
  revokeAllUserSessions,
  setSessionCookies,
  clearSessionCookies,
  SESSION_COOKIES,
  SESSION_TTL,
} from './session'
export {
  hashPassword,
  verifyPassword,
  validatePassword,
  PasswordValidationError,
  PASSWORD_RESET_TTL_MS,
} from './password'
export * from './validators'
export * from './otp-validators'
