/**
 * Reports types — P4-07.
 */

export type ReportRangePreset = '7d' | '30d' | '90d' | 'mtd' | 'qtd' | 'ytd' | 'custom'

export interface ReportRange {
  /** ISO string. */
  from: string
  /** ISO string. */
  to: string
  /** Source preset (only for display/CSV metadata). */
  preset?: ReportRangePreset
}

/** Daily bucket for revenue chart. */
export interface RevenueBucket {
  date: string // YYYY-MM-DD
  orderCount: number
  grossCents: string // BigInt serialized
  netCents: string // after discount
}

export interface RevenueReport {
  range: ReportRange
  totals: {
    orderCount: number
    grossCents: string
    discountCents: string
    netCents: string
    refundCents: string
    avgOrderCents: string
  }
  buckets: RevenueBucket[]
  byPaymentMethod: Array<{
    method: string
    orderCount: number
    netCents: string
  }>
}

export interface InventoryReport {
  totals: {
    products: number
    itemsAvailable: number
    itemsReserved: number
    itemsDelivered: number
    itemsExpired: number
    lowStockProducts: number
  }
  /** Per-product stock aggregation. */
  byProduct: Array<{
    productId: string
    productName: string
    productSku: string
    available: number
    reserved: number
    delivered: number
    total: number
    lowStockThreshold: number
    isLowStock: boolean
  }>
}

export interface TopProductsReport {
  range: ReportRange
  limit: number
  items: Array<{
    productId: string
    productName: string
    productSku: string
    quantitySold: number
    grossCents: string
    orderCount: number
  }>
}
