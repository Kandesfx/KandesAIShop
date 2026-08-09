import { describe, it, expect, vi, beforeEach } from 'vitest'
import { productRepository } from './repository'

/**
 * Unit tests cho cross-sell query logic — Phase 9 D2.
 */

const findManyMock = vi.fn()

vi.mock('@/lib/db', () => ({
  db: {
    product: {
      findMany: (...args: unknown[]) => findManyMock(...args),
    },
  },
}))

function makeProduct(id: string, viewCount: number) {
  return {
    id,
    avgRating: { toNumber: () => 4.5 },
    viewCount,
  }
}

describe('productRepository.getCrossSell', () => {
  beforeEach(() => {
    findManyMock.mockReset()
  })

  it('queries same category with price range ±30%', async () => {
    findManyMock
      .mockResolvedValueOnce([makeProduct('p1', 10), makeProduct('p2', 5)])
      .mockResolvedValueOnce([]) // fallback query (2 < limit 6) — không có thêm sản phẩm

    const result = await productRepository.getCrossSell('current-id', 'cat-1', BigInt(100000), 6)

    expect(findManyMock).toHaveBeenCalledTimes(2) // primary query + fallback (2 < limit 6)
    const callArgs = findManyMock.mock.calls[0]![0] as {
      where: {
        id: { not: string }
        categoryId: string
        priceCents: { gte: bigint; lte: bigint }
      }
      orderBy: { viewCount: string }
      take: number
    }

    expect(callArgs.where.id.not).toBe('current-id')
    expect(callArgs.where.categoryId).toBe('cat-1')
    expect(callArgs.where.priceCents.gte).toBe(BigInt(70000))
    expect(callArgs.where.priceCents.lte).toBe(BigInt(130000))
    expect(callArgs.orderBy).toEqual({ viewCount: 'desc' })
    expect(callArgs.take).toBe(6)
    expect(result).toHaveLength(2)
    expect(result[0]!.avgRating).toBe(4.5)
  })

  it('falls back to same-category products (no price filter) when not enough results', async () => {
    findManyMock
      .mockResolvedValueOnce([makeProduct('p1', 10)])
      .mockResolvedValueOnce([makeProduct('p2', 3), makeProduct('p3', 1)])

    const result = await productRepository.getCrossSell('current-id', 'cat-1', BigInt(100000), 3)

    expect(findManyMock).toHaveBeenCalledTimes(2)
    const fallbackArgs = findManyMock.mock.calls[1]![0] as {
      where: { id: { notIn: string[] }; categoryId: string }
      take: number
    }
    expect(fallbackArgs.where.id.notIn).toEqual(['current-id', 'p1'])
    expect(fallbackArgs.take).toBe(2)
    expect(result.map((p) => p.id)).toEqual(['p1', 'p2', 'p3'])
  })

  it('does not query fallback when enough results already found', async () => {
    findManyMock.mockResolvedValueOnce([
      makeProduct('p1', 10),
      makeProduct('p2', 5),
      makeProduct('p3', 3),
    ])

    const result = await productRepository.getCrossSell('current-id', 'cat-1', BigInt(100000), 3)

    expect(findManyMock).toHaveBeenCalledTimes(1)
    expect(result).toHaveLength(3)
  })
})