-- 1. Ensure category 'ai-code'
INSERT INTO categories (id, slug, name, description, position, is_active, created_at, updated_at)
VALUES (
  'cat-ai-code-0000-000000000001',
  'ai-code',
  'AI Code Tools',
  'Cursor Pro, Claude Code, Codex GPT — Công cụ AI lập trình hàng đầu.',
  1,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active = true,
  updated_at = NOW();

-- 2. Upsert Cursor Pro
INSERT INTO products (
  id, category_id, name, slug, sku, short_description, description,
  price_cents, sale_price_cents, delivery_strategy, stock_status, track_inventory,
  is_published, is_featured, metadata, created_at, updated_at
)
VALUES (
  'prod-cursor-pro-000000000001',
  (SELECT id FROM categories WHERE slug = 'ai-code' LIMIT 1),
  'Cursor Pro',
  'cursor-pro',
  'CRS-PRO',
  'Hỗ trợ nhiều mô hình cao cấp: Opus, Sonnet, GPT, Grok...',
  'Cursor Pro là AI code editor hàng đầu, hỗ trợ đầy đủ các mô hình cao cấp nhất: Claude 3.7 Sonnet, Claude 3.5 Sonnet, Claude 3 Opus, GPT-4o, GPT-5, Grok... Tự động hoàn thành mã nguồn, chỉnh sửa đa file (multi-file editing) và chế độ Agent thông minh.',
  55000,
  35000,
  'MANUAL_KEY',
  'in_stock',
  false,
  true,
  true,
  '{"badge":"MUST-HAVE FOR CODERS","tag":"HOT"}'::jsonb,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  sku = EXCLUDED.sku,
  short_description = EXCLUDED.short_description,
  description = EXCLUDED.description,
  price_cents = 55000,
  sale_price_cents = 35000,
  delivery_strategy = 'MANUAL_KEY',
  stock_status = 'in_stock',
  track_inventory = false,
  is_published = true,
  is_featured = true,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

-- Cursor Pro Variants
INSERT INTO product_variants (id, product_id, name, sku, price_cents, sale_price_cents, duration_days, position, is_active, metadata, created_at)
VALUES
  ('var-crs-1d-400r', (SELECT id FROM products WHERE slug = 'cursor-pro'), 'Gói 1 ngày (400 requests / ngày)', 'CRS-PRO-1D-400R', 55000, 35000, 1, 1, true, '{"discount":"-36%","requests":"400 requests / ngày","label":"1 ngày"}'::jsonb, NOW()),
  ('var-crs-3d-400r', (SELECT id FROM products WHERE slug = 'cursor-pro'), 'Gói 3 ngày (400 requests / ngày)', 'CRS-PRO-3D-400R', 110000, 70000, 3, 2, true, '{"discount":"-36%","requests":"400 requests / ngày","label":"3 ngày"}'::jsonb, NOW()),
  ('var-crs-7d-400r', (SELECT id FROM products WHERE slug = 'cursor-pro'), 'Gói 7 ngày (400 requests / ngày)', 'CRS-PRO-7D-400R', 160000, 100000, 7, 3, true, '{"discount":"-38%","requests":"400 requests / ngày","label":"7 ngày"}'::jsonb, NOW()),
  ('var-crs-30d-1300r', (SELECT id FROM products WHERE slug = 'cursor-pro'), 'Gói 30 ngày (1300 requests / 30 ngày)', 'CRS-PRO-30D-1300R', 250000, 150000, 30, 4, true, '{"discount":"-40%","requests":"1300 requests / 30 ngày","label":"30 ngày"}'::jsonb, NOW()),
  ('var-crs-30d-6500r', (SELECT id FROM products WHERE slug = 'cursor-pro'), 'Gói 30 ngày (6500 requests / 30 ngày)', 'CRS-PRO-30D-6500R', 450000, 270000, 30, 5, true, '{"discount":"-40%","requests":"6500 requests / 30 ngày","label":"30 ngày VIP"}'::jsonb, NOW())
ON CONFLICT (sku) DO UPDATE SET
  name = EXCLUDED.name,
  price_cents = EXCLUDED.price_cents,
  sale_price_cents = EXCLUDED.sale_price_cents,
  duration_days = EXCLUDED.duration_days,
  position = EXCLUDED.position,
  is_active = true,
  metadata = EXCLUDED.metadata;

-- 3. Upsert Claude Code
INSERT INTO products (
  id, category_id, name, slug, sku, short_description, description,
  price_cents, sale_price_cents, delivery_strategy, stock_status, track_inventory,
  is_published, is_featured, metadata, created_at, updated_at
)
VALUES (
  'prod-claude-code-000000000001',
  (SELECT id FROM categories WHERE slug = 'ai-code' LIMIT 1),
  'Claude Code',
  'claude-code',
  'CLD-CODE',
  'Tối ưu hóa dòng lệnh với mô hình Opus và Sonnet siêu mạnh mẽ',
  'Claude Code là CLI Terminal Agent từ Anthropic, cho phép lập trình viên chạy lệnh, đọc/sửa file, debug và build codebase trực tiếp trong terminal với sức mạnh của Claude 3.7 Sonnet và Opus.',
  45000,
  20000,
  'MANUAL_KEY',
  'in_stock',
  false,
  true,
  true,
  '{"badge":"CLI TERMINAL AGENT","tag":"NEW"}'::jsonb,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  sku = EXCLUDED.sku,
  short_description = EXCLUDED.short_description,
  description = EXCLUDED.description,
  price_cents = 45000,
  sale_price_cents = 20000,
  delivery_strategy = 'MANUAL_KEY',
  stock_status = 'in_stock',
  track_inventory = false,
  is_published = true,
  is_featured = true,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

-- Claude Code Variants
INSERT INTO product_variants (id, product_id, name, sku, price_cents, sale_price_cents, duration_days, position, is_active, metadata, created_at)
VALUES
  ('var-cld-10usd-30d', (SELECT id FROM products WHERE slug = 'claude-code'), 'Hạn mức 10$ trong 30 ngày', 'CLD-CODE-10USD-30D', 45000, 20000, 30, 1, true, '{"discount":"-56%","quotaUsd":10,"label":"10$ / 30 ngày"}'::jsonb, NOW()),
  ('var-cld-50usd-30d', (SELECT id FROM products WHERE slug = 'claude-code'), 'Hạn mức 50$ trong 30 ngày', 'CLD-CODE-50USD-30D', 160000, 80000, 30, 2, true, '{"discount":"-50%","quotaUsd":50,"label":"50$ / 30 ngày"}'::jsonb, NOW()),
  ('var-cld-500usd-30d', (SELECT id FROM products WHERE slug = 'claude-code'), 'Hạn mức 500$ trong 30 ngày', 'CLD-CODE-500USD-30D', 1300000, 650000, 30, 3, true, '{"discount":"-50%","quotaUsd":500,"label":"500$ / 30 ngày"}'::jsonb, NOW())
ON CONFLICT (sku) DO UPDATE SET
  name = EXCLUDED.name,
  price_cents = EXCLUDED.price_cents,
  sale_price_cents = EXCLUDED.sale_price_cents,
  duration_days = EXCLUDED.duration_days,
  position = EXCLUDED.position,
  is_active = true,
  metadata = EXCLUDED.metadata;

-- 4. Upsert Codex GPT
INSERT INTO products (
  id, category_id, name, slug, sku, short_description, description,
  price_cents, sale_price_cents, delivery_strategy, stock_status, track_inventory,
  is_published, is_featured, metadata, created_at, updated_at
)
VALUES (
  'prod-codex-gpt-0000000000001',
  (SELECT id FROM categories WHERE slug = 'ai-code' LIMIT 1),
  'Codex GPT',
  'codex-gpt',
  'CDX-GPT',
  'Sử dụng các mô hình tiên tiến: GPT 5.4, 5.5, 5.6 (Sol, Terra, Luna)',
  'Codex GPT tích hợp mượt mà cho VS Code & macOS, hỗ trợ đầy đủ các model GPT thế hệ mới: GPT-5.4, GPT-5.5, GPT-5.6 (Sol, Terra, Luna) với tốc độ sinh mã cực nhanh và độ chính xác cao.',
  45000,
  20000,
  'MANUAL_KEY',
  'in_stock',
  false,
  true,
  true,
  '{"badge":"FOR VSCODE & MACOS","tag":"HOT"}'::jsonb,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  sku = EXCLUDED.sku,
  short_description = EXCLUDED.short_description,
  description = EXCLUDED.description,
  price_cents = 45000,
  sale_price_cents = 20000,
  delivery_strategy = 'MANUAL_KEY',
  stock_status = 'in_stock',
  track_inventory = false,
  is_published = true,
  is_featured = true,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

-- Codex GPT Variants
INSERT INTO product_variants (id, product_id, name, sku, price_cents, sale_price_cents, duration_days, position, is_active, metadata, created_at)
VALUES
  ('var-cdx-10usd-30d', (SELECT id FROM products WHERE slug = 'codex-gpt'), 'Hạn mức 10$ trong 30 ngày', 'CDX-GPT-10USD-30D', 45000, 20000, 30, 1, true, '{"discount":"-56%","quotaUsd":10,"label":"10$ / 30 ngày"}'::jsonb, NOW()),
  ('var-cdx-20usd-30d', (SELECT id FROM products WHERE slug = 'codex-gpt'), 'Hạn mức 20$ trong 30 ngày', 'CDX-GPT-20USD-30D', 75000, 35000, 30, 2, true, '{"discount":"-53%","quotaUsd":20,"label":"20$ / 30 ngày"}'::jsonb, NOW()),
  ('var-cdx-50usd-30d', (SELECT id FROM products WHERE slug = 'codex-gpt'), 'Hạn mức 50$ trong 30 ngày', 'CDX-GPT-50USD-30D', 160000, 80000, 30, 3, true, '{"discount":"-50%","quotaUsd":50,"label":"50$ / 30 ngày"}'::jsonb, NOW()),
  ('var-cdx-100usd-30d', (SELECT id FROM products WHERE slug = 'codex-gpt'), 'Hạn mức 100$ trong 30 ngày', 'CDX-GPT-100USD-30D', 300000, 150000, 30, 4, true, '{"discount":"-50%","quotaUsd":100,"label":"100$ / 30 ngày"}'::jsonb, NOW()),
  ('var-cdx-500usd-30d', (SELECT id FROM products WHERE slug = 'codex-gpt'), 'Hạn mức 500$ trong 30 ngày', 'CDX-GPT-500USD-30D', 1300000, 650000, 30, 5, true, '{"discount":"-50%","quotaUsd":500,"label":"500$ / 30 ngày"}'::jsonb, NOW())
ON CONFLICT (sku) DO UPDATE SET
  name = EXCLUDED.name,
  price_cents = EXCLUDED.price_cents,
  sale_price_cents = EXCLUDED.sale_price_cents,
  duration_days = EXCLUDED.duration_days,
  position = EXCLUDED.position,
  is_active = true,
  metadata = EXCLUDED.metadata;
