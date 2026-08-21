-- Cập nhật hình ảnh và giá gốc + giá khuyến mãi cho 3 sản phẩm AI Coding Tools

-- 1. Cursor Pro
UPDATE products
SET 
  price_cents = 50000,
  sale_price_cents = 35000
WHERE slug = 'cursor-pro';

DELETE FROM product_media WHERE product_id IN (SELECT id FROM products WHERE slug = 'cursor-pro');
INSERT INTO product_media (id, product_id, type, url, alt_text, position, created_at)
SELECT gen_random_uuid(), id, 'image', '/assets/products/cursor-pro.svg', 'Cursor Pro AI Code Editor', 0, NOW()
FROM products WHERE slug = 'cursor-pro';

UPDATE product_variants
SET 
  price_cents = 50000,
  sale_price_cents = 35000
WHERE product_id IN (SELECT id FROM products WHERE slug = 'cursor-pro');

-- 2. Claude Code
UPDATE products
SET 
  price_cents = 30000,
  sale_price_cents = 20000
WHERE slug = 'claude-code';

DELETE FROM product_media WHERE product_id IN (SELECT id FROM products WHERE slug = 'claude-code');
INSERT INTO product_media (id, product_id, type, url, alt_text, position, created_at)
SELECT gen_random_uuid(), id, 'image', '/assets/products/claude-code.svg', 'Anthropic Claude Code Agent', 0, NOW()
FROM products WHERE slug = 'claude-code';

UPDATE product_variants
SET 
  price_cents = 30000,
  sale_price_cents = 20000
WHERE product_id IN (SELECT id FROM products WHERE slug = 'claude-code');

-- 3. Codex GPT
UPDATE products
SET 
  price_cents = 100000,
  sale_price_cents = 70000
WHERE slug = 'codex-gpt';

DELETE FROM product_media WHERE product_id IN (SELECT id FROM products WHERE slug = 'codex-gpt');
INSERT INTO product_media (id, product_id, type, url, alt_text, position, created_at)
SELECT gen_random_uuid(), id, 'image', '/assets/products/codex-gpt.svg', 'OpenAI Codex GPT & ChatGPT', 0, NOW()
FROM products WHERE slug = 'codex-gpt';

UPDATE product_variants
SET 
  price_cents = 100000,
  sale_price_cents = 70000
WHERE product_id IN (SELECT id FROM products WHERE slug = 'codex-gpt');
