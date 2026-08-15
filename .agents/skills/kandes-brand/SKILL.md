---
name: kandes-brand
description: Brand voice, design tokens, and copy patterns for Kandes.shop — the Vietnamese AI coding tools marketplace. Use when designing, copy-writing, or restyling any UI in the Kandes.shop codebase (auth, products, checkout, emails, admin). Combines the official design-taste-frontend anti-slop rules with project-specific identity (cyberpunk cyan + plasma purple, 30-second auto-delivery, Vietnamese primary language).
---

# Kandes.shop Brand Identity

Kandes.shop là **cửa hàng số chuyên sản phẩm AI / công cụ lập trình** tại Việt Nam. Bán các license chính hãng: Cursor Pro, Windsurf, GitHub Copilot, Claude Pro, ChatGPT Plus, JetBrains AI, OpenRouter. **Giao tự động qua email trong 30 giây** — không chờ đợi, không thủ tục.

## Brand in 3 pillars

1. **Cyberpunk tech aesthetic** — dark surfaces, electric cyan, RGB-shift glitch, scanlines, grid-tech background. Không neon green, không rainbow gradient AI-điển-hình.
2. **30-second delivery promise** — every touchpoint reinforces speed. Không "vui lòng đợi xử lý". UX phải reflect instant.
3. **Vietnamese-first, engineer-respecting** — copy ngắn, technical, không sentimental. Người mua là dev, biết Cursor/Copilot là gì. Không giải thích thừa.

## When to apply this skill

Use this skill whenever:

- Thêm/sửa page, modal, toast, email, README copy trong repo Kandes.shop
- Redesign component (`components/`, `app/`, `modules/`)
- Tạo CTA, hero, pricing card, banner, badge
- Viết Vietnamese marketing copy
- Apply design tokens (`bg-electric`, `font-display`, `text-display-xl`...)
- Apply animation (`animate-rgb-shift`, `animate-scanline`, `animate-pulse-dot`)
- AI agent đề xuất generic UI → gặp lại "Material look" / "AI purple gradient" → STOP — replace bằng Kandes tokens

## The 3 Locks (must respect)

🔒 **Color Lock** — accented cyan. **`#00E5FF` là accent duy nhất** trên page-except warm CTA gradient `#FF6A2C` (`bg-gradient-buy-now`) cho nút "MUA NGAY". Không thêm accent lạ (no green, no pink only, no blue-with-different-hue).

🔒 **Shape Lock** — **sharp aesthetic**. `border-radius: 2xl = 12px` max. KHÔNG `rounded-full`, `rounded-3xl`, `rounded-2xl`. Tất cả corner ticks, dot-matrix, bracket markers. Ngoại lệ: Google OAuth button `rounded-full` (chỉ khi copy đè lên).

🔒 **Theme Lock** — **dark mode only**. Light mode chưa support. `bg-ink-900` page, `bg-ink-800/700` cards. KHÔNG `bg-white`, KHÔNG `bg-slate-50`. Nếu user cần light, đó là out-of-scope của skill này — escalate.

## Design tokens (canonical reference)

### Color

| Token | Hex | Vai trò | Dùng cho |
|-------|-----|---------|----------|
| `ink-900` | `#05060A` | Page background | body, dark sections |
| `ink-800` | `#06080D` | Surface base | section backgrounds |
| `ink-700` | `#080B11` | Card default | bills, product cards |
| `ink-600` | `#0C1018` | Card hover | hover states |
| `ink-500` | `#12161F` | Borders on dark | default borders |
| `ink-400` | `#1F2733` | Subtle borders | dividers |
| `ink-300` | `#4A5769` | Mid borders | inputs, dividers |
| `ink-200` | `#7C8AA1` | Subdued text | captions, hints |
| `ink-100` | `#BFCBDB` | Secondary text | descriptions |
| `ink-50` | `#E6EDF5` | Primary text | headings, body |
| `electric` | `#00E5FF` | Primary accent | links, CTA icons, highlights |
| `electric-hover` | `#00B8CC` | Accent hover | hover states |
| `electric-muted` | `rgba(0,229,255,.12)` | Tint bg | active bg, focus ring |
| `electric-deep` | `#0088A8` | Accent dark | pressed states |
| `plasma` | `#7C3AED` | Secondary accent | CTA hover, chips |
| `plasma-hover` | `#A855F7` | Plasma hover | hover states |
| `sunset` | `#FF6A2C` | Warm CTA | "MUA NGAY" button only |
| `danger` | `#FF3366` | Errors | error states, rgb-shift offset |
| `warning` | `#FFB800` | Warnings | notice banners |
| `success` | `#00E5FF` | Success | success = cyan (matches electric) |

### Typography

```css
--font-display:  'Space Grotesk', 'JetBrains Mono', system-ui, sans-serif;  // headings, wordmark
--font-sans:     Inter, system-ui, -apple-system, sans-serif;             // body
--font-mono:     'JetBrains Mono', 'SF Mono', Menlo, monospace;            // labels, code, captions
```

**Coupling rules**:
- `font-display` → `tracking-tight` (-0.02em to -0.03em), `font-weight 600-700`
- `font-mono` → `uppercase`, `tracking-wider` (0.08em), `text-[10px-12px]` cho labels
- `font-sans` → default cho body, `text-body` (15px / 1.65) or `text-body-lg` (17px)

### Type scale

| Class | Size | Use |
|-------|------|-----|
| `text-display-xl` | `clamp(56px, 9vw, 96px)` | Hero wordmark |
| `text-display-lg` | `clamp(40px, 6vw, 64px)` | Hero headline |
| `text-h1` | 40px | Page title |
| `text-h2` | 28px | Card title |
| `text-h3` | 22px | Sub-section |
| `text-h4` | 18px | Sub-sub |
| `text-body-lg` | 17px | Lead paragraph |
| `text-body` | 15px | Body default |
| `text-body-sm` | 13px | Secondary |
| `text-caption` | 11px | Eyebrows / mono labels |

### Radius scale

```
none, sm (2px), DEFAULT (4px), md (4px), lg (6px), xl (8px), 2xl (12px max)
```

KHÔNG BAO GIỜ `rounded-full`, `rounded-3xl`. Pill-shape không tồn tại.

### Shadows / Glows

| Token | Use |
|-------|-----|
| `shadow-sm` | `0 1px 0 0 rgba(255,255,255,0.04)` — subtle inset highlight |
| `shadow-md` | `0 0 0 1px rgba(255,255,255,0.06)` — border ring |
| `shadow-lg` | ring + soft drop — cards, modals |
| `shadow-glow-electric` | electric-cyan glow ring — focus, active CTA |
| `shadow-glow-plasma` | plasma-purple glow ring — secondary CTA hover |

### Background utilities

| Class | Use |
|-------|-----|
| `bg-grid-tech` | 48px cyan grid lines — section backdrop |
| `bg-noise` | SVG fractal noise — texture overlay |
| `bg-scanlines` | 2px horizontal cyan scanlines — cyberpunk overlay |
| `bg-gradient-ai-gateway` | `purple → indigo → cyan` 135° — hero CTA card |
| `bg-gradient-buy-now` | `orange → red` 135° — "MUA NGAY" button |
| `bg-gradient-text-electric` | `cyan → purple → cyan` 135° — heading gradient |
| `bg-gradient-text-warm` | `orange → red → pink` 135° — warm text gradient |

### Animation utilities

| Class | Use |
|-------|-----|
| `animate-fade-in` | 200ms content fade |
| `animate-slide-up` | 280ms content slide-up |
| `animate-rgb-shift` | 3s red/cyan text-shadow glitch — hero headlines |
| `animate-scanline` | 8s scanline sweep — empty-state accents |
| `animate-flicker` | 6s neon-tube flicker — secondary headlines |
| `animate-pulse-dot` | 1.8s status dot blink — "online" indicators |
| `animate-marquee` | 40s logo ticker — partner logos |
| `animate-shimmer` | 2s loading shimmer — placeholders |
| `animate-float` | 4s gentle vertical float — auth card decoration |
| `animate-glow-pulse` | 3s opacity glow — focus rings |
| `animate-slide-in-up` | 0.6s entrance (final state) — auth reveal |

## Brand voice (Vietnamese)

### Tone

- **Ngắn**, **trực tiếp**, **technical**
- Không sentimental, không "chúng tôi tự hào", không "trải nghiệm tuyệt vời"
- Nói như dev nói với dev (peer-to-peer)
- Địa chỉ người đọc bằng "bạn" informal, không "quý khách" không "anh/chị"

### Patterns (từ codebase)

#### Hero / headline

✅ ĐÚNG:
- "Cursor Pro, Windsurf, GitHub Copilot — chính hãng"
- "Giao tự động qua email trong 30 giây"
- "Không chờ đợi. Không thủ tục."
- "30 giây. Có license. Dùng được."

❌ SAI:
- "Chào mừng bạn đến với thế giới AI coding tuyệt vời"
- "Trải nghiệm mua sắm đỉnh cao"
- "Khám phá sức mạnh của AI ngay hôm nay"
- "Sản phẩm chất lượng cao, giá cả hợp lý"

#### CTA buttons

✅ ĐÚNG:
- "MUA NGAY" (uppercase, mono, sunset gradient)
- "Kích hoạt tài khoản"
- "Xem giá"
- "Sao chép key"
- "Đăng nhập với Google"

❌ SAI:
- "Bắt đầu hành trình của bạn"
- "Khám phá ngay"
- "Đăng ký miễn phí"
- "Tìm hiểu thêm"

#### Error / notice

✅ ĐÚNG:
- "Email này đã được sử dụng"
- "Mật khẩu phải có ít nhất 8 ký tự"
- "Không tìm thấy tài khoản với email này"
- "Khóa không hợp lệ. Liên hệ hỗ trợ."

❌ SAI:
- "Đã xảy ra lỗi. Vui lòng thử lại sau."
- "Rất tiếc, chúng tôi không thể hoàn thành yêu cầu của bạn."

#### Success

✅ ĐÚNG:
- "Đã gửi email xác nhận"
- "License đã được kích hoạt"
- "Thanh toán thành công"
- "Sao chép key vào clipboard"

❌ SAI:
- "Chúc mừng! Bạn đã thành công!"
- "Tuyệt vời! Hãy bắt đầu nào!"

### Numbers

- Dùng **digits ASCII** trong body copy (không phải tiếng Việt diacritics).
- Bao giờ cũng có đơn vị: "30 giây", không "30s"; "12 tháng", không "12mo".
- Tiền: "299.000đ" hoặc "299K" — KHÔNG "299 nghìn đồng".

## Component patterns (already in codebase)

### `<Button>` — 5 variants

| Variant | Use | Class |
|---------|-----|-------|
| `primary` | Default blue CTA | `btn-primary` — defined in `globals.css` |
| `secondary` | Secondary action | `btn-secondary` |
| `outline` | Tertiary | `btn-outline` |
| `ghost` | Inline nav | `btn-ghost` |
| `danger` | Destructive | `bg-danger border-danger text-ink-50` |

Sizes: `sm` (px-3 py-1.5 text-body-sm), `md` (px-4 py-2.5 text-body), `lg` (px-6 py-3 text-body-lg).

### `<Input>` — base with `leftIcon`

```tsx
<Input label="Email" type="email" leftIcon={<Mail size={14} />} placeholder="you@domain.com" />
```

### `<Card>` — glass surface

```tsx
<Card className="bg-ink-700/40 border-ink-400/60 backdrop-blur-xl">
  {/* content */}
</Card>
```

### Hero CTA cards (gradient)

```tsx
{/* AI gateway card */}
<div className="bg-gradient-ai-gateway p-6 text-ink-50">...</div>

{/* Buy now card */}
<button className="bg-gradient-buy-now text-ink-900 px-6 py-3 font-mono uppercase tracking-wider">
  MUA NGAY
</button>
```

### Decorative elements (cyberpunk motifs)

| Element | Code |
|---------|------|
| Corner ticks (4 corners) | `<span className="absolute top-2 right-2 h-2 w-2 border-r border-t border-electric/60" />` (×4 corners) |
| Status dot | `<span className="inline-block w-2 h-2 bg-success animate-pulse-dot" />` |
| Background grid | `<div className="absolute inset-0 bg-grid-tech bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />` |
| Scanline overlay | `<div className="absolute inset-0 bg-scanlines opacity-40 pointer-events-none" />` |
| RGB-shift text | `<span className="animate-rgb-shift">KHANDES</span>` |
| Dot-matrix | `<div className="h-1 w-12 bg-[radial-gradient(circle,rgba(0,229,255,0.6)_1px,transparent_1.5px)] bg-[length:6px_6px]" />` |

## Anti-AI-slop rules (Kandes specific)

🚫 **Cấm**:

| Pattern | Lý do | Replacement |
|---------|-------|-------------|
| `bg-gradient-to-r from-purple-500 to-pink-500` | Generic AI gradient | `bg-gradient-text-electric` hoặc `bg-gradient-buy-now` |
| `rounded-full` pills | Không khớp sharp aesthetic | `rounded-none` hoặc `rounded-2xl` |
| `text-3xl font-bold` | Generic sizing | `text-h1` hoặc `text-display-lg` |
| Card với `shadow-2xl` + hover grow | Generic Material | `shadow-glow-electric` + `border-electric/60` |
| AI icon (brain, stars, sparkle) làm CTA | Cliché | Arrow + bracket markers `[]` |
| `text-3xl text-center mb-8` hero | Boring | Asymmetric grid, đặt glow-electric ở góc |
| Three equal feature cards | Generic | Hero z-pattern hoặc 2-column asymmetric |
| Verified reviews "⭐⭐⭐⭐⭐" section | Suspicious | Replace bằng community count + product count |
| "100% Free" / "Best in class" superlatives | Generic marketing | Specific facts: "30 giây", "Tự động", "VNĐ" |
| `hover:scale-105` trên mọi button | Generic | `hover:shadow-glow-electric` thay thế |
| "Get started" button | Generic | "Kích hoạt" / "MUA NGAY" |
| Conscious stock photos | Unprofessional | Mono cyan viền corner + grid-tech background |
| "🚀 Level Up Your Coding" emoji-spam | Cliché | Cấm emoji trừ `◆` `▸` `[]` bracket markers |
| Three colors "color palette" promo | Generic | Show token: `#00E5FF`. Numbers ngầu. |
| Long chính sách điều khoản pages | Boring | Short numbered bullets, mono labels |

✅ **Khuyến khích**:

| Pattern | Vì sao |
|---------|--------|
| `animate-rgb-shift` trên wordmark | Cyberpunk signature |
| `bg-grid-tech` background | Depth without distraction |
| `text-caption font-mono uppercase` cho micro-labels | Technical feel |
| `bg-gradient-buy-now` cho "MUA NGAY" | Warm contrast pops |
| `border-electric-bordered` corner ticks | Branded microdetail |
| `animate-pulse-dot` status indicators | Real-time feel |
| `CodeBlock` showcases terminal-style | Engineer audience |
| Specific numbers first ("30 giây", "299K", "100+") | Concrete > abstract |

## Tone & copy checklist

Trước khi ship bất kỳ copy nào, check:

- [ ] Có 1 chữ số cụ thể (30s, 299K, 100+) không?
- [ ] Dùng "bạn" không "quý khách"?
- [ ] Có CTA cụ thể (MUA NGAY / Kích hoạt) không?
- [ ] Có dùng fraud-text? ("trải nghiệm tuyệt vời" → ❌)
- [ ] Eyebrow labels uppercase mono không?
- [ ] Slogan dài < 12 từ không?
- [ ] Tránh emoji-spam (chỉ giữ `◆` `▸` `[]` brackets)?

## Layout patterns

### Auth shell (split-screen)

```tsx
<div className="relative min-h-screen overflow-hidden bg-ink-900 text-ink-50">
  {/* backdrop */}
  <div className="pointer-events-none absolute inset-0 -z-10">
    <div className="absolute -top-40 -left-40 h-[420px] w-[420px] rounded-full bg-electric/20 blur-[120px] animate-float-slow" />
    <div className="absolute -bottom-40 -right-40 h-[520px] w-[520px] rounded-full bg-plasma/25 blur-[140px] animate-float-slower" />
    <div className="absolute inset-0 bg-grid-tech bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black_50%,transparent_85%)]" />
  </div>

  <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-1 lg:grid-cols-2">
    {/* HERO — hidden on mobile */}
    <aside className="hidden lg:flex flex-col justify-between p-16">
      <Logo /> {/* with animate-rgb-shift on wordmark */}
      <div className="space-y-8 max-w-lg">
        {/* headline with text-gradient-electric on highlight word */}
      </div>
    </aside>

    {/* FORM */}
    <main className="flex items-center justify-center px-5 py-10 sm:px-8 lg:py-16">
      <div className="w-full max-w-md">
        <div className="relative overflow-hidden border border-ink-400/60 bg-ink-700/40 backdrop-blur-xl p-6 sm:p-8">
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-electric to-transparent opacity-80 animate-glow-pulse" />
          {/* 4 corner ticks */}
        </div>
      </div>
    </main>
  </div>
</div>
```

### Product card (gradient + border electric)

```tsx
<Card className="relative group overflow-hidden border-ink-400/60 bg-ink-700/40 hover:border-electric/60 transition-colors duration-fast">
  <div className="absolute top-2 right-2 flex gap-1">
    <span className="h-2 w-2 border-r border-t border-electric/60" />
    <span className="h-2 w-2 border-r border-t border-electric/60" />
  </div>
  <div className="p-6">
    <div className="text-caption font-mono uppercase text-ink-200">// cursor-pro</div>
    <h3 className="text-h2 font-display tracking-tight text-ink-50 mt-1">Cursor Pro</h3>
    <p className="text-body text-ink-100 mt-2">AI-powered code editor</p>
    <div className="mt-6 flex items-baseline gap-2">
      <span className="text-display-lg font-display tracking-tight">299K</span>
      <span className="text-caption font-mono uppercase text-ink-200">/tháng</span>
    </div>
    <Button variant="primary" className="w-full mt-6 group">
      <span>MUA NGAY</span>
      <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
    </Button>
  </div>
</Card>
```

### Admin empty state

```tsx
<div className="border border-ink-400/60 bg-ink-700/40 p-8 text-center relative">
  <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-electric to-transparent opacity-60" />
  <div className="inline-block p-3 border border-electric/40 mb-4">
    <Inbox size={20} className="text-electric" />
  </div>
  <h3 className="text-h3 font-display text-ink-50">Chưa có đơn hàng</h3>
  <p className="text-body-sm text-ink-200 mt-2">Đơn hàng mới sẽ xuất hiện tại đây trong 30 giây.</p>
</div>
```

## Workflow: Apply this skill

1. **Read** codebase trước: `tailwind.config.ts`, `app/globals.css`, existing `components/` để nắm pattern đang dùng
2. **Match existing tokens** — approach bất kỳ element nào: đã có `bg-electric` không? Có `Card` variant tương ứng không?
3. **Decide variants** — primary CTA → `bg-gradient-buy-now`. Secondary → `btn-primary`. Tertiary → `btn-outline`.
4. **Check anti-slop** — đảm bảo không vi phạm 14 banned patterns ở trên
5. **Run copy checklist** — phi-lô-ri Vietnamese voice, numerals, CTA
6. **Verify responsive** — `lg:grid-cols-2` auth shell, stack on mobile
7. **Hot reload** — `npm run dev` + visual check tại `localhost:3000/{route}`

## Cross-skill protocol

Skill này **composes** với official `design-taste-frontend` (đã cài):

- `design-taste-frontend` → generic anti-slop rules (em-dash, three-equal-card, AI-purple gradient)
- `kandes-brand` (this) → Kandes-specific tokens, voice, copy, motifs

Khi cả hai đều active, both apply. Nếu có conflict (e.g., sharp-vs-soft border radius), `kandes-brand` wins vì project-specific dominates.

## What this skill explicitly does NOT do

- Không design logo mới — wordmark pattern đã fix
- Không chọn accent color khác — cyan là duy nhất
- Không light mode — dark only
- Không responsive > 1440px (mobile + desktop only)
- Không tự push lên Vercel — chỉ guide UI
- Không tự ý thêm dependency mới — extend stack hiện tại

## Reference: existing components

| Component | File | Used for |
|-----------|------|----------|
| `Button` | `components/ui/button.tsx` | All CTAs |
| `Input` | `components/ui/input.tsx` | All forms |
| `PasswordInput` | `components/ui/password-input.tsx` | Password fields |
| `Card` | `components/ui/card.tsx` | Container |
| `Badge` | `components/ui/badge.tsx` | Status pills |
| `CodeBlock` | `components/ui/code-block.tsx` | Terminal commands, API keys |
| `Toast` | `components/ui/toast.tsx` | Notifications |
| `AuthShell` | `components/auth/auth-shell.tsx` | Login/Register wrapper |
| `GoogleSigninButton` | `components/auth/google-signin-button.tsx` | OAuth |
| `OtpInput` | `components/auth/otp-input.tsx` | OTP code entry |
| `Header` | `components/layout/header.tsx` | Site nav |
| `Footer` | `components/layout/footer.tsx` | Site footer |

Luôn ưu tiên **extend existing component** thay vì tạo mới.
