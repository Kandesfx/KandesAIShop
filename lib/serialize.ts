/**
 * Serialize BigInt, Prisma Decimal, Date an toàn khi trả API response.
 *
 * Next.js Response.json() dùng JSON.stringify mặc định không biết cách
 * encode BigInt — throw error. Helpers dưới đây convert trước khi trả về client.
 *
 * Quy tắc chuyển đổi (theo MASTER_SPEC §4.4):
 *   - BigInt        → string (giữ chính xác, không mất precision)
 *   - Prisma Decimal → number (an toàn vì amount < 2^53)
 *   - Date          → ISO string
 *   - Buffer/Uint8Array → base64 string (cho valueEncrypted)
 *   - null/undefined → giữ nguyên
 *   - Array/object   → đệ quy
 *
 * Hai API:
 *   - jsonReplacer: dùng cho JSON.stringify(value, replacer)
 *   - serialize(): wrapper tiện dụng, deep-clone + convert
 */

type JsonReplacer = (key: string, value: unknown) => unknown

/** Prisma.Decimal có dạng { d: number[], e: number, s: number } */
function isPrismaDecimalLike(val: unknown): val is { d: number[]; e: number; s: number } {
  if (!val || typeof val !== 'object') return false
  const obj = val as Record<string, unknown>
  return Array.isArray(obj.d) && typeof obj.e === 'number' && typeof obj.s === 'number'
}

export const jsonReplacer: JsonReplacer = (_key, val) => {
  if (val === null || val === undefined) return val
  if (typeof val === 'bigint') return val.toString()
  if (val instanceof Date) return val.toISOString()
  if (val instanceof Buffer) return val.toString('base64')
  if (val instanceof Uint8Array) return Buffer.from(val).toString('base64')
  if (isPrismaDecimalLike(val)) {
    const dec = val as unknown as { d: number[]; e: number; s: number }
    return decimalToNumber(dec)
  }
  return val
}

/** Chuyển Prisma.Decimal-like object → number an toàn. */
function decimalToNumber(d: { d: number[]; e: number; s: number }): number {
  // Decimal.js internal: d = digits (mỗi elem 0-1e7), e = exponent, s = sign
  // Ví dụ: 240000.00 → d: [24000000], e: -6, s: 1 → 240000
  const digits = d.d.reduce((acc, n) => acc * 1e7 + n, 0)
  const num = digits * 10 ** d.e
  return d.s === -1 ? -num : num
}

/** Serialize object thành JSON-safe object (deep clone + convert). */
export function serialize<T>(value: T): T {
  return JSON.parse(JSON.stringify(value, jsonReplacer)) as T
}
