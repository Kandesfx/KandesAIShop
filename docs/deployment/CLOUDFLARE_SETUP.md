# Cloudflare Proxy Setup — Kandes.shop (D63)

> **Date:** 2026-08-09
> **Approach:** Worker route (Cloudflare as DNS primary, selective proxy)
> **Status:** Ready to execute (manual steps in Cloudflare dashboard)

---

## ⚠️ IMPORTANT — Risks

1. **NS switch**: Nameservers sẽ thay đổi từ AWS Route 53 → Cloudflare.
   - DNS propagation: 5 phút - 48 giờ (thường < 30 phút)
   - During propagation: có thể intermittent (1 số request đi qua CF, 1 số qua Route 53)

2. **Email preservation**: SES DKIM, SPF, DMARC, MX phải giữ nguyên → set **DNS only** (grey cloud) cho các records email

3. **Root domain preservation**: `kandes.shop` + `www.kandes.shop` đang point CloudFront → giữ nguyên → set **DNS only**

4. **ACM validation**: `_66bfe8c18de41b8cc5dc9b0c37541c28.kandes.shop` → DNS only (không phải proxy)

---

## Step-by-step

### Phase 1: Add domain to Cloudflare (10 min)

1. Login Cloudflare: https://dash.cloudflare.com/login
2. Click **"Add a Site"** → nhập `kandes.shop`
3. Select plan: **Free** ($0/mo)
4. Cloudflare sẽ scan DNS records tự động (khoảng 30s)

### Phase 2: Verify DNS records (5 min)

Sau khi Cloudflare scan xong, **PHẢI verify** các records sau tồn tại với đúng values:

| Type | Name | Value | Proxy status |
|------|------|-------|--------------|
| A | kandes.shop | (alias → CloudFront `d1ejmpir98cn4v.cloudfront.net`) | **DNS only** (grey cloud) |
| AAAA | kandes.shop | (alias → CloudFront) | **DNS only** |
| NS | kandes.shop | (Cloudflare's NS sẽ tự thêm) | n/a |
| CNAME | `_66bfe8c18de41b8cc5dc9b0c37541c28` | `_cf857ab78acdab4f64f37f631e08ce4b.jkddzztszm.acm-validations.aws` | **DNS only** |
| TXT | `_amazonses` | `BYs4Gb0NvZ6Y5C9gKvdanL+x16HSA/xZuIxDCfvigxg=` | **DNS only** |
| TXT | `_dmarc` | `v=DMARC1; p=quarantine; rua=mailto:admin@kandes.shop` | **DNS only** |
| CNAME | `grnxyp4i5cinpvpngyjawy243rrda2e7._domainkey` | `...dkim.amazonses.com` | **DNS only** |
| CNAME | `k2senuuetkm4unk7hgskpf5xsc6jesns._domainkey` | `...dkim.amazonses.com` | **DNS only** |
| CNAME | `rujazh5rnrkmbherkjvpkk7jyhaq7mpd._domainkey` | `...dkim.amazonses.com` | **DNS only** |
| MX | mail | `10 feedback-smtp.ap-southeast-1.amazonses.com` | **DNS only** |
| TXT | @ | `v=spf1 include:amazonses.com -all` | **DNS only** |
| A | www | (alias → CloudFront) | **DNS only** |
| AAAA | www | (alias → CloudFront) | **DNS only** |

⚠️ **QUAN TRỌNG**: Tất cả records trên phải để **DNS only** (click grey cloud). Cloudflare scan tự động đôi khi set proxy ON cho A records → phải check lại.

### Phase 3: Add api.kandes.shop record (2 min)

1. Click **"Add record"** trong DNS tab
2. Type: **CNAME**
3. Name: **api**
4. Target: **kandes-prod-app (EC2 Elastic IP)** — lấy từ AWS Console:
   - AWS → EC2 → Instances → `i-0a6fca834c9429bca` → copy IPv4 Public IP: `13.215.39.207`
   - Cloudflare chấp nhận cả IP (CNAME flattening cho apex)
   - Target: `13.215.39.207`
5. Proxy: **ON** (orange cloud) ✅ ← quan trọng nhất
6. Click **Save**

### Phase 4: Configure SSL/TLS (5 min)

1. SSL/TLS → Overview → **Full** (không Strict vì EC2 dùng Let's Encrypt)
2. Edge Certificates → Always Use HTTPS: **ON**
3. Wait 1-2 phút để Cloudflare provision edge cert cho `api.kandes.shop`

### Phase 5: Configure WAF (5 min)

1. Security → WAF:
   - Bot Fight Mode: **ON**
   - Security Level: **Medium**
2. Security → DDoS → tự động bảo vệ

### Phase 6: Get Cloudflare nameservers (1 phút)

Cloudflare dashboard sẽ show 2 nameservers (vd `anna.ns.cloudflare.com`):
```
ns1.cloudflare.com
ns2.cloudflare.com
```
(thực tế sẽ là names riêng của Cloudflare assigned cho domain này)

### Phase 7: Update Route 53 nameservers (5 min)

⚠️ **Bước quan trọng nhất — phá vỡ nếu sai**

1. AWS Console → Route 53 → Hosted zones → `kandes.shop`
2. Click vào NS record (type NS, name `kandes.shop.`)
3. Edit → thay 4 records cũ bằng 2 nameservers Cloudflare cung cấp
4. Save

⚠️ **Rollback**: Nếu có vấn đề, chỉ cần đổi lại 4 nameservers AWS cũ (5 phút propagate).

### Phase 8: Verify (10-30 min)

```powershell
# Wait 5-30 phút cho DNS propagate

# Check NS records
nslookup -type=NS kandes.shop
# Expected: cloudflare.com nameservers

# Check api.kandes.shop resolves via Cloudflare
nslookup api.kandes.shop
# Expected: Cloudflare IP (104.x.x.x or 172.x.x.x)

# Check root domain still works
curl -I https://kandes.shop
# Expected: 200 OK

# Check api subdomain
curl -I https://api.kandes.shop/v1/models
# Expected: 200 OK (through Cloudflare → EC2)

# Check email (MX)
nslookup -type=MX kandes.shop
# Expected: feedback-smtp.ap-southeast-1.amazonses.com
```

### Phase 9: Monitor (24 giờ đầu)

Watch:
- Cloudflare Analytics → Traffic
- AWS Route 53 → Query volume (should drop khi Cloudflare handle cache)
- AWS EC2 → Bandwidth (should drop for cached content)
- AWS billing (should not spike)

---

## Rollback procedure

Nếu có vấn đề NGHIÊM TRỌNG trong vòng 24 giờ đầu:

1. AWS Console → Route 53 → Hosted zones → `kandes.shop`
2. NS record → Edit → đổi về 4 nameservers AWS cũ:
   ```
   ns-1211.awsdns-23.org.
   ns-300.awsdns-37.com.
   ns-921.awsdns-51.net.
   ns-1879.awsdns-42.co.uk.
   ```
3. Save → wait 5-30 phút propagate
4. Cloudflare dashboard → Domain → Remove from Cloudflare (optional)

---

## Cost impact

| Item | Before | After |
|------|--------|-------|
| Route 53 hosted zone | $0.50/mo | $0.50/mo (vẫn charge nếu không xóa) |
| Route 53 queries | <1M/mo = free | Same |
| Cloudflare Free | $0 | $0 |
| **Total** | ~$0.50/mo | ~$0.50/mo |

---

## Expected benefits (after setup)

- ✅ Latency user VN: 30-80ms (EC2 SG) → 10-30ms (Cloudflare edge SG)
- ✅ Bandwidth cost: giảm ~50% (Cloudflare cache)
- ✅ DDoS protection: free tier
- ✅ WAF basic rules: free tier
- ⚠️ Root domain unchanged (vẫn qua CloudFront + EC2)