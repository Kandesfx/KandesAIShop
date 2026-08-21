/**
 * TechTicker — Thanh scrolling ticker phong cách công nghệ.
 *
 * Hiển thị ngay dưới header, chạy ngang liên tục (CSS marquee).
 * Mỗi item mô phỏng status hệ thống (SECURE CHECKOUT / ENABLED, etc.).
 *
 * Trick để seamless loop: render nội dung 2 lần liên tiếp, animation
 * translateX(-50%) khiến set thứ 2 thế chỗ set thứ 1 — loop vô tận.
 *
 * Height: h-9 (36px) — cần tính vào hero min-height.
 */

const TICKER_ITEMS = [
  { label: 'SECURE CHECKOUT', value: 'ENABLED', status: 'ok' },
  { label: 'NODE:ASIA-SE', value: 'ONLINE', status: 'ok' },
  { label: 'PAYMENT RAIL', value: 'READY', status: 'ok' },
  { label: 'AI GATEWAY', value: 'ACTIVE', status: 'ok' },
  { label: 'AUTO DELIVERY', value: '<30S', status: 'ok' },
  { label: 'SUPPORT', value: '24/7', status: 'ok' },
  { label: 'KEY INVENTORY', value: 'IN STOCK', status: 'ok' },
  { label: 'UPTIME', value: '99.9%', status: 'ok' },
]

export function TechTicker() {
  // Render items 2 lần cho seamless marquee loop
  const renderItems = () =>
    TICKER_ITEMS.map((item, idx) => (
      <span key={idx} className="inline-flex items-center gap-3 shrink-0">
        <span className="text-ink-200">►</span>
        <span className="text-ink-100">{item.label}</span>
        <span className="text-ink-300">/</span>
        <span className="text-electric">{item.value}</span>
      </span>
    ))

  return (
    <div
      className="relative w-full h-9 bg-ink-800/80 border-b border-ink-400/50 overflow-hidden select-none"
      aria-hidden="true"
    >
      {/* Subtle scanline texture */}
      <div className="absolute inset-0 bg-scanlines opacity-30 pointer-events-none" />

      {/* Edge fade — trái */}
      <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-ink-800 to-transparent z-10 pointer-events-none" />
      {/* Edge fade — phải */}
      <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-ink-800 to-transparent z-10 pointer-events-none" />

      {/* Scrolling content */}
      <div className="flex items-center h-full animate-marquee whitespace-nowrap gap-8 text-[11px] font-mono uppercase tracking-[0.14em]">
        {renderItems()}
        {/* Duplicate for seamless loop */}
        {renderItems()}
      </div>
    </div>
  )
}
