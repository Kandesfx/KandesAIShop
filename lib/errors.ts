/**
 * Custom error classes cho Kandes.shop.
 * Mọi lỗi trong service throw 1 trong các class này để route handler có thể
 * map sang HTTP status code + response shape thống nhất.
 */

export type ErrorField = { field: string; message: string }

export class AppError extends Error {
  readonly code: string
  readonly statusCode: number
  readonly fields?: ErrorField[]

  constructor(code: string, message: string, statusCode: number, fields?: ErrorField[]) {
    super(message)
    this.name = this.constructor.name
    this.code = code
    this.statusCode = statusCode
    this.fields = fields
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      ...(this.fields ? { fields: this.fields } : {}),
    }
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Dữ liệu không hợp lệ', fields?: ErrorField[]) {
    super('VALIDATION_ERROR', message, 422, fields)
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Không tìm thấy') {
    super('NOT_FOUND', message, 404)
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Chưa đăng nhập') {
    super('UNAUTHENTICATED', message, 401)
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Không đủ quyền') {
    super('FORBIDDEN', message, 403)
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Xung đột dữ liệu', fields?: ErrorField[]) {
    super('CONFLICT', message, 409, fields)
  }
}

export class OutOfStockError extends AppError {
  constructor(message = 'Sản phẩm đã hết hàng') {
    super('OUT_OF_STOCK', message, 409)
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Quá nhiều yêu cầu, vui lòng thử lại sau') {
    super('RATE_LIMITED', message, 429)
  }
}

export class PaymentError extends AppError {
  constructor(message = 'Thanh toán thất bại') {
    super('PAYMENT_FAILED', message, 402)
  }
}
