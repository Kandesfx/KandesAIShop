/**
 * SePay reconcile job — Phase 3 P3-02.
 *
 * Pull recent bank transactions từ SePay REST API, gọi `recordPayment` cho từng
 * transaction. `recordPayment` đã idempotent qua `providerTransactionId` nên khi
 * webhook đã chạm transaction trước đó → kind='duplicate' (zero side-effect).
 *
 * Why polling + webhook cùng tồn tại?
 *   - Webhook là primary path (SePay gọi ta real-time).
 *   - Polling là safety net khi webhook miss/got dropped (network hiccup, SePay
 *     downtime, retry config). Vercel Cron cron-every-5min quét 1h qua (đủ overlap).
 *
 * Env: `SEPAY_API_TOKEN`. Nếu thiếu → no-op (return counts nop = 0 toàn bộ).
 *
 * ⚠️ Không log raw content (chứa PII) — chỉ log counts + tx id.
 */

import { env } from '../../lib/env'
import { logger } from '../../lib/logger'
import { extractPaymentReference, recordPayment } from '../payment'
import type { JobHandler } from './types'

const SEPAY_TRANSACTIONS_API = 'https://my.sepay.vn/userapi/transactions/list'
/** Time window để quét mỗi tick (cron chạy mỗi 5 phút). */
const RECONCILE_WINDOW_HOURS = 1
/** Max transactions per call (SePay cho phép tới 100 theo docs). */
const MAX_PER_PAGE = 100

type SepayListResponse = {
  status: number
  messages: { code: string }
  data: Array<{
    id: number
    gateway: string
    transactionDate: string
    accountNumber: string
    code?: string | null
    content: string
    transferAmount: number
    accumulated?: number | null
    subAccount?: string | null
    referenceCode?: string | null
    description?: string | null
  }>
}

export const sepayReconcile: JobHandler<
  'pulled' | 'processed' | 'matched' | 'duplicates' | 'errors'
> = async () => {
  const counts = { pulled: 0, processed: 0, matched: 0, duplicates: 0, errors: 0 }

  // Dev/test env thiếu token → silent no-op (caller counts vẫn trả để log monitro).
  if (!env.SEPAY_API_TOKEN) {
    logger.debug('sepay-reconcile: SEPAY_API_TOKEN missing — no-op')
    return counts
  }

  // Compute window: từ `now - 1h` → `now`.
  const now = new Date()
  const windowStart = new Date(now.getTime() - RECONCILE_WINDOW_HOURS * 60 * 60 * 1000)

  // SePay API yêu cầu ISO 8601 ('YYYY-MM-DD HH:mm:ss') theo doc công khai.
  const fmt = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0')
    return (
      `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ` +
      `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`
    )
  }

  const url = new URL(SEPAY_TRANSACTIONS_API)
  url.searchParams.set('account_number', env.SEPAY_ACCOUNT_NUMBER ?? '')
  url.searchParams.set('from_date', fmt(windowStart))
  url.searchParams.set('to_date', fmt(now))
  url.searchParams.set('limit', String(MAX_PER_PAGE))

  let resp: Response
  try {
    resp = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${env.SEPAY_API_TOKEN}`,
        Accept: 'application/json',
      },
      // Vercel + Node 18+ mặc định 10s; cho cron 15s buffer.
      signal: AbortSignal.timeout(15_000),
    })
  } catch (err) {
    counts.errors += 1
    logger.error({ err: (err as Error).message }, 'sepay-reconcile: SePay API call fail')
    return counts
  }

  if (!resp.ok) {
    counts.errors += 1
    logger.error(
      { status: resp.status, statusText: resp.statusText },
      'sepay-reconcile: SePay API returned non-2xx'
    )
    return counts
  }

  let json: SepayListResponse
  try {
    json = (await resp.json()) as SepayListResponse
  } catch {
    counts.errors += 1
    logger.error('sepay-reconcile: invalid JSON response')
    return counts
  }

  const txs = Array.isArray(json?.data) ? json.data : []
  counts.pulled = txs.length

  for (const tx of txs) {
    counts.processed += 1
    try {
      const orderNumber = extractPaymentReference(tx.content)
      if (!orderNumber) continue // skip no-match gracefully

      const result = await recordPayment({
        providerTransactionId: String(tx.id),
        orderNumber,
        amountCents: BigInt(tx.transferAmount),
        transactionDate: new Date(tx.transactionDate),
        rawPayload: tx, // SePay returns object; we trust SePay's shape
      })

      if (result.kind === 'processed') {
        counts.matched += 1
        // Fire-and-forget delivery trigger (mirrors webhook flow).
        const { deliveryService } = await import('../delivery')
        void deliveryService.processOrder(result.orderId).catch((err: unknown) => {
          logger.error(
            { err: (err as Error).message, orderId: result.orderId },
            'sepay-reconcile: delivery process fail (post-payment)'
          )
        })
      } else if (result.kind === 'duplicate') {
        counts.duplicates += 1
      }
    } catch (err) {
      counts.errors += 1
      logger.error(
        { err: (err as Error).message, txId: tx.id },
        'sepay-reconcile: recordPayment error'
      )
    }
  }

  logger.info(counts, 'sepay-reconcile: tick done')
  return counts
}
