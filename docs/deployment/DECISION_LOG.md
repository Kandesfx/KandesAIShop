# Kandes.shop — Deployment Decision Log

> **Mục đích:** Ghi lại lịch sử thảo luận & quyết định giữa user và AI agent về kiến trúc deployment. Để AI agents tương lai hiểu context user + approach đã chọn.
>
> **Ngày tạo:** 2026-08-07
> **Cập nhật cuối:** 2026-08-07

---

## 1. User profile (cập nhật 2026-08-07)

| Aspect | Value | Ghi chú |
|--------|-------|---------|
| **Mục tiêu dự án** | AI Gateway + e-commerce shop bán digital goods (AI products, tools) | Production-grade, có user thật |
| **Mục tiêu kỹ thuật** | Học AWS + triển khai production nghiêm túc | Không chỉ prototype/demo |
| **Ngân sách** | Rất eo hẹp, free-tier first | Sẵn sàng burn credits để lấy kinh nghiệm, có guard rails |
| **Tone ưa thích** | "Chơi khô máu đã, hạ sau nếu nguy cơ" | Risk-taker khi đã có safety mechanism |
| **Ưu tiên performance** | Latency quan trọng cho AI streaming | User VN chịu delay là churn |
| **Ưu tiên learning** | AWS depth > multi-cloud breadth | Tập trung 1 platform, học sâu |

---

## 2. Decision timeline

### Decision #1: Compute layer (2026-08-06) — D60
**Quyết định:** Amplify Hosting → EC2 t3.micro + Docker + Nginx
**Lý do user:** Muốn học AWS sâu (SSH, IAM, security group, Docker, Nginx, CloudWatch)
**Trade-off đã accept:** +3-5 ngày setup, +$7-10/mo sau Free Tier
**Tài liệu:** `docs/deployment/AWS_ARCHITECTURE.md` §3.4

### Decision #2: CI/CD layer (2026-08-06) — D61
**Quyết định:** GitHub Actions self-hosted runner + OIDC deploy role
**Lý do:** GitHub-hosted runner queue stuck; cần full control
**Trade-off:** Workflow skip lint/test (codebase chưa clean) — sẽ fix Phase UI cleanup
**Workflow file:** `.github/workflows/deploy-prod.yml`

### Decision #3: Upgrade instance + Cloudflare edge (2026-08-07) — D62, D63, D64
**Cuộc thảo luận gốc:**

User mở đầu câu hỏi "CÓ phương án khác để hybrid nền tảng free khác vào để giảm bớt gánh nặng không?" — sau khi Phase 7-H EC2 deployment đang gặp vấn đề (build chậm, RAM ít, latency cao với user VN).

**AI đề xuất 4 options:**

| Option | Cost/mo | Build time | Pros | Cons |
|--------|---------|------------|------|------|
| **A**: Oracle Cloud Free (ARM A1) | $0 | 2-3 min | 24 GB RAM vĩnh viễn | Vendor mới, ARM |
| **B**: Supabase + Vercel + R2 | $0 | 30s (Vercel) | Edge DX tốt | Multi-vendor, ít AWS |
| **C**: t3.micro + cache (current) | $0 | 15-20 min | Backward compat | RAM ít |
| **D**: Upgrade lên t3.small | $10 | 5-10 min | AWS familiar | Tốn tiền |

User đã phản hồi critical:
- "Trước đó tôi tưởng 'Free tier eligible' chỉ là marketing, nhưng screenshot của bạn cho thấy m7i-flex.large CÓ nằm trong Free tier → bạn đã sai khi bỏ qua"
- "Hệ thống phải chịu tải AI streaming thật, không chỉ để học"
- "Tôi sợ deploy thì hệ thống bị delay ảnh hưởng người dùng"

AI đã research workload:
- I/O-bound + light CPU
- Streaming SSE partial line buffer (không cần RAM lớn)
- Peak RAM 400-600 MB cho 50 concurrent streams
- Risk lớn nhất: Prisma pool exhaust
- Recommendation: 2 vCPU / 4 GB production threshold

AI đã phân tích migration paths:
- Stop → Change Instance Type → Start (~2 min downtime)
- AMI → Launch new (~5-10 min)
- EBS volume giữ nguyên data 100%

**User quyết định cuối:**

> "Đầu tiên là tôi muốn học hỏi và tìm hiểu cũng như xem xét thử nên tảng AWS nên tôi sẽ tận dụng hết mức có thể những tài nguyên sẵn ở gói free, kèm theo đó cũng không được để môi trường production của tôi kém hiệu quả trước môi trường thực tế."
>
> "Bởi vậy tôi lựa chọn phương án vẫn giữ lại trên AWS gần như toàn bộ nhưng ngoại trừ các gateway từ người dùng tới endpoint tôi muốn dùng bên Cloudflare như bạn nói để bớt 1 phần gánh nặng cũng như chi phí đường truyền."
>
> "Và tôi không ngần ngại thử gói cao để lấy kinh nghiệm cho riêng tôi, hãy lấy gói cao hiện tại là gói m7i-flex.large để thử, nếu trong thời gian tôi quan sát thấy ngân sách bị đốt nhiều và nguy cơ cao thì tôi sẽ quyết định hạ xuống sau, trước tiên hãy chơi khô máu đã."
>
> "Nhưng tôi cũng có thể nhờ bạn thêm cơ chế an toàn đặt hạn mức, cảnh báo sớm,...trên AWS giúp tôi để dễ kiểm soát hơn."
>
> "Những quyết định và lịch sử tìm hiểu qua đoạn chat nãy giờ của tôi với bạn về vấn đề này tôi muốn bạn ghi lại thành tài liệu để sau này các AI cũng có thể hiểu điều tôi mong muốn, hiểu hơn về tôi hiện tại"

**Quyết định chính thức (3 deviations mới):**

| # | Item | Chi tiết |
|---|------|---------|
| **D62** | Upgrade EC2 t3.micro → **m7i-flex.large** (2 vCPU, 8 GB RAM Intel) | $0.1197/hr full-time, $200 credits dùng ~2.2 tháng. Sẵn sàng hạ khi budget risk cao. |
| **D63** | Cloudflare proxy ở front | Subdomain `api.kandes.shop` (AI gateway) đi Cloudflare để edge streaming + bandwidth savings. Static + admin pages giữ Route 53 → CloudFront. |
| **D64** | Safety mechanism | AWS Budget alarm ($100/$150/$180) + auto-stop schedule + CloudWatch alarm |

---

## 3. AWS Free Tier — Critical reference (cập nhật 2026-08-07)

**Lưu ý quan trọng cho AI agents tương lai:**

AWS đã thay đổi chính sách Free Tier (2026). Có 4 tier mới:

| Tier | Duration | Credits | Use case |
|------|----------|---------|----------|
| **Free plan** | **6 tháng** | $100 instant + $100 earn = **$200 total** | Tài khoản mới |
| **Paid plan** | Unlimited | Cũng có $200 credits | Long-term |
| **Trial (12 mo)** | 12 tháng | None | Services listed |
| **Always Free** | Unlimited | None | 30+ services (Lambda, DynamoDB, CloudFront, R2...) |

### EC2 Free Plan eligible (NEW 2026):
- **t3.micro** (2 vCPU, 1 GB) — $0.0132/hr
- **t3.small** (2 vCPU, 2 GB) — $0.0264/hr
- **t4g.micro** (2 vCPU, 1 GB ARM) — $0.0084/hr
- **t4g.small** (2 vCPU, 2 GB ARM) — $0.0168/hr
- **c7i-flex.large** (2 vCPU, 4 GB Intel) — $0.0801/hr
- **m7i-flex.large** (2 vCPU, 8 GB Intel) — **$0.1197/hr** ← user đã chọn

⚠️ AI trước đây đã SAI khi nói "12 tháng free trial" cho t3.micro. Cần đọc AWS docs mới nhất.

### Credits burn rate (user's concern):
- t3.micro full-time: $200 / $9.6 = **~20 tháng**
- t3.small full-time: $200 / $19 = **~10 tháng**
- **m7i-flex.large full-time: $200 / $89.7 = ~2.2 tháng** ← high risk
- m7i-flex.large 8hrs/day (auto-stop 16h): $200 / $28.7 = **~7 tháng** ← recommended

---

## 4. Hybrid architecture cuối cùng (2026-08-07)

```
                    ┌─────────────────────────────┐
                    │   Cloudflare (Free Proxy)   │
   User VN ────────►│  • DNS proxy                │
   (10-30ms)        │  • SSL termination          │
                    │  • DDoS protection          │
                    │  • WAF basic rules          │
                    │  • Unlimited bandwidth      │
                    └──────────┬──────────────────┘
                               │
                  api.kandes.shop (AI gateway)
                               │
                               ▼
                    ┌─────────────────────────────┐
                    │   Route 53 + CloudFront     │
                    │  • Primary DNS              │
                    │  • CDN cho static + admin   │
                    └──────────┬──────────────────┘
                               │
                               ▼
        ┌──────────────────────────────────────────────┐
        │       AWS EC2 m7i-flex.large                 │
        │       (2 vCPU, 8 GB RAM, Intel)              │
        │                                              │
        │  ┌──────────────┐    ┌──────────────────┐  │
        │  │ Nginx + SSL  │    │  Docker app      │  │
        │  │ reverse proxy│───►│  Next.js + Prisma│  │
        │  └──────────────┘    └──────────────────┘  │
        │                                              │
        │  ┌──────────────┐    ┌──────────────────┐  │
        │  │ RDS Postgres │    │ Upstash Redis    │  │
        │  │ (Free 12mo)  │    │ (Free tier)      │  │
        │  └──────────────┘    └──────────────────┘  │
        └──────────────────────────────────────────────┘
                               │
                               ▼
        ┌──────────────────────────────────────────────┐
        │    S3 (blobs) + SES (email) + Secrets Mgr    │
        │    CloudWatch (logs) + Budget alarms         │
        └──────────────────────────────────────────────┘
```

---

## 5. Safety mechanism (D64) — Implementation plan

### Budget control (AWS Budgets):

```bash
# scripts/aws/budget-alarm.sh
# Tạo 3 alarms:
#   $100 (50% burn) → email + telegram warning
#   $150 (75% burn) → email + telegram urgent
#   $180 (90% burn) → email + telegram critical + auto-stop optional
```

### Auto-stop schedule (saves ~67% credits):

```bash
# scripts/aws/schedule-stop-start.sh
# EventBridge rule:
#   cron(0 16 * * ? *)   # 16:00 UTC = 23:00 VN → STOP instance
#   cron(0 0 * * ? *)    # 00:00 UTC = 07:00 VN → START instance
# Target: Lambda function stop-start-instance
# Total uptime: 8 hrs/day
# m7i-flex.large cost: $28.7/mo vs $89.7/mo (24/7)
```

### CloudWatch alarms:

```bash
# scripts/aws/cloudwatch-alarm.sh
# Alarm 1: CPU < 5% trong 30 min → SNS → telegram (idle warning)
# Alarm 2: StatusCheck failed → SNS → telegram (urgent)
# Alarm 3: EstimatedCharges > threshold → SNS → telegram (cost warning)
```

### Telegram notification integration:

- Reuse existing `TELEGRAM_BOT_TOKEN` + `TELEGRAM_ADMIN_CHAT_ID` from .env
- SNS topic → Lambda function → telegram API
- Bot đã có sẵn từ Phase 5

---

## 6. Lessons learned cho AI agents tương lai

### Lesson 1: Đừng assume AWS Free Tier là 12 tháng
- 2026 model: **6 tháng + $200 credits** cho Free plan
- User có thể có account cũ (12-month tier) hoặc mới (6-month tier)
- Luôn check `aws ec2 describe-account-attributes` để xác nhận

### Lesson 2: "Free tier eligible" label có nhiều instance
- Không chỉ t2/t3 micro
- m7i-flex.large, c7i-flex.large CŨNG thuộc Free plan eligible
- Khi đề xuất upgrade, list TẤT CẢ options, đừng assume user đã biết

### Lesson 3: User risk tolerance cao khi có safety mechanism
- "Chơi khô máu đã" = aggressive khi có budget cap + alarms
- Không cần khuyên conservative; thay vào đó BUILD the safety nets
- User sẽ tự điều chỉnh nếu alarms trigger

### Lesson 4: AI streaming latency là khía cạnh critical
- User đã nhắc nhiều lần: "sợ delay ảnh hưởng người dùng"
- Mỗi lần đề xuất architecture, PHẢI tính latency từ user VN → app
- Cloudflare edge = best choice (10-30ms) so với EC2 SG (30-80ms)

### Lesson 5: Migration path cần explain TRƯỚC khi user quyết upgrade
- User đã hỏi "có chuyển backup qua máy mới được không?"
- Cần show rõ: Stop → Change Type → Start = zero data loss
- Build AMI → Launch = full snapshot
- Đừng assume user biết AWS instance type migration

### Lesson 6: Khi user nói "ghi lại thành tài liệu"
- Ghi vào CONTEXT.md §7 deviations (D-numbered)
- Tạo file decision log riêng (file này)
- Cả 2 đều cần thiết: deviations = spec changes, decision log = context/reasoning

---

## 7. Open questions (cập nhật 2026-08-07)

| # | Question | Decision | Note |
|---|----------|----------|------|
| 1 | Route 53 vs Cloudflare primary DNS | **Route 53 primary, Cloudflare partial (CNAME only cho api.*)** | User chọn: giữ Route 53 control, chỉ proxy `api.kandes.shop` qua Cloudflare. Không switch nameservers. |
| 2 | Auto-stop schedule | **23:00-07:00 VN (8 hrs/day, 67% savings)** | User chọn: balance giữa cost saving + uptime. Schedule = `cron(0 16 * * ? *)` stop, `cron(0 0 * * ? *)` start. |
| 3 | Migration timing | **Phase 8 (UI cleanup) trước, migrate sau** | User chọn: ưu tiên fix UI bugs đã phát hiện; upgrade instance làm sau khi codebase clean. |
| 4 | Cloudflare plan | **Free plan ($0/mo)** | User chọn: Free tier đủ cho bandwidth savings + DDoS protection. Advanced WAF chưa cần. |
| 5 | Budget alarm thresholds | **$50/$100/$150 (strict - 25%/50%/75%)** | User chọn: alarm sớm để can thiệp kịp thời. Trade-off: nhiều alert hơn nhưng an toàn hơn. |

---

## 8. References

- AWS Free Tier chính thức: https://aws.amazon.com/free/
- AWS EC2 Pricing: https://aws.amazon.com/ec2/pricing/on-demand/
- Cloudflare Plans: https://www.cloudflare.com/plans/
- Migration scripts: `scripts/aws/` (sẽ tạo)
- Deviation D62-D64 trong `CONTEXT.md` §7
