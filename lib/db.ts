import { PrismaClient } from '@prisma/client'

/**
 * Prisma client singleton.
 *
 * Trong Next.js dev mode, mỗi lần hot-reload có thể tạo nhiều instance
 * nếu không cache trên `globalThis`. Cache để tránh exhaust connection pool.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['warn', 'error']
        : process.env.PRISMA_LOG_QUERIES === 'true'
          ? ['query', 'warn', 'error']
          : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
}

/** Graceful shutdown — gọi khi process thoát. */
export async function disconnectDb(): Promise<void> {
  await db.$disconnect()
}
