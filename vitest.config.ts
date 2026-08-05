import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.ts', '**/*.test.tsx'],
    exclude: ['node_modules', '.next', 'e2e/**'],
    setupFiles: ['./vitest.setup.ts'],
    testTimeout: 30000,
    // Integration tests share state (DB). Chạy tuần tự.
    fileParallelism: false,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './'),
    },
  },
})
