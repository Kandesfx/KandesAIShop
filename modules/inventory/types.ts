/**
 * Inventory types — Phase 3 P3-03.
 *
 * Public types cho API responses. BigInt serialize thành string.
 */

export type InventoryItemView = {
  id: string
  batchId: string
  productId: string
  variantId: string | null
  fingerprint: string
  status: 'available' | 'reserved' | 'delivered' | 'returned' | 'expired'
  reservedForOrderId: string | null
  reservedAt: string | null
  deliveredAt: string | null
  returnedAt: string | null
  expiresAt: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

export type InventoryBatchView = {
  id: string
  productId: string
  variantId: string | null
  source: 'manual' | 'csv' | 'api'
  importedBy: string
  note: string | null
  itemCount: number
  availableCount: number
  reservedCount: number
  deliveredCount: number
  createdAt: string
}

export type ListInventoryResult = {
  items: InventoryItemView[]
  page: number
  limit: number
  total: number
  hasMore: boolean
}