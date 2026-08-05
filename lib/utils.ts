import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Gộp className + xử lý conflict Tailwind (vd: 'p-2 p-4' → 'p-4').
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// === Re-exports từ lib/format.ts để tương thích ngược với code cũ.
// Vẫn nên import trực tiếp từ '@/lib/format' trong code mới.
export { formatVnd, slugify, maskSecret } from './format'
