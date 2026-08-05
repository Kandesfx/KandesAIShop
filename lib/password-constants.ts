/**
 * Password validation regex theo BR-4.2.
 * Tách riêng để validators cũng dùng chung mà không kéo theo argon2 dependency.
 *
 * Rule: tối thiểu 8 ký tự, có chữ (Latin hoặc có dấu) và số.
 */
export const PASSWORD_REGEX = /^(?=.*[a-zA-ZÀ-ỹ])(?=.*\d).{8,}$/u
