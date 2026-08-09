import { useEffect, useRef } from 'react'

/**
 * usePrevious — track giá trị previous của một state/prop.
 * 
 * Dùng để so sánh giá trị hiện tại với giá trị trước đó,
 * ví dụ: detect khi itemCount tăng lên (add to cart).
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>()

  useEffect(() => {
    ref.current = value
  }, [value])

  return ref.current
}
