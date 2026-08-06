# Migration Plan: t3.micro → m7i-flex.large

> **Ngày tạo:** 2026-08-07
> **Liên quan:** D62 (CONTEXT.md §7), DECISION_LOG.md
> **Estimated time:** 30-45 phút
> **Risk level:** Medium (chỉ downtime ~2 phút)

---

## 1. Pre-migration checklist

- [ ] **Verify AWS Free Tier status** — confirm account còn dùng Free plan (không phải Paid)
- [ ] **Snapshot EBS volume** — backup an toàn trước khi change type
- [ ] **Snapshot RDS** — nếu dùng RDS thay vì self-host
- [ ] **Snapshot S3 buckets** — confirm versioning enabled
- [ ] **Backup secrets** — Secrets Manager đã có backup chưa?
- [ ] **Backup GitHub Actions runner config** — runner token, labels, .runner
- [ ] **Check IAM role permissions** — service role attach đúng chưa?
- [ ] **Verify Elastic IP** — disassociate từ instance cũ trước khi stop
- [ ] **Notify user trước 5 phút** — qua telegram bot (hoặc manual)
- [ ] **Stop long-running operations** — disable cron, pause notification queue

---

## 2. Step-by-step migration

### Step 1: Snapshot EBS volume (5 phút)

```bash
# Từ EC2 console hoặc AWS CLI
aws ec2 create-snapshot \
  --volume-id vol-XXXXX \
  --description "Pre-migration backup - t3.micro to m7i-flex.large - 2026-08-07" \
  --tag-specifications 'ResourceType=snapshot,Tags=[{Key=Name,Value=kandes-pre-migration},{Key=Date,Value=2026-08-07}]'
```

Hoặc dùng EC2 → Volumes → Actions → Create Snapshot.

### Step 2: Disassociate Elastic IP (1 phút)

```bash
# Lưu lại IP allocation-id trước
aws ec2 describe-addresses --query 'Addresses[?Tags[?Key==`Name` && Value==`kandes-prod`]]'

# Disassociate
aws ec2 disassociate-address --association-id eipassoc-XXXXX
```

### Step 3: Stop instance (30s)

```bash
aws ec2 stop-instances --instance-ids i-XXXXX
```

⚠️ **Lưu ý:** Data trong RAM sẽ mất. Đảm bảo:
- Postgres ghi hết WAL xuống disk (Postgres checkpointer chạy định kỳ)
- Next.js không có request đang pending
- Notification queue đã xử lý hết pending jobs

### Step 4: Change instance type (30s)

```bash
aws ec2 modify-instance-attribute \
  --instance-id i-XXXXX \
  --instance-type "{"Value": "m7i-flex.large"}"
```

Hoặc: EC2 Console → Instances → Actions → Instance Settings → Change Instance Type → m7i-flex.large → Apply.

### Step 5: Re-associate Elastic IP (30s)

```bash
aws ec2 associate-address \
  --instance-id i-XXXXX \
  --allocation-id eipalloc-XXXXX
```

### Step 6: Start instance (30-60s)

```bash
aws ec2 start-instances --instance-id i-XXXXX
```

### Step 7: Verify health (5 phút)

```bash
# SSH vào instance
ssh -i ~/.ssh/kandes-prod.pem ec2-user@<elastic-ip>

# Check system
nproc              # Should show 2
free -h            # Should show ~8 GB
df -h              # Check disk usage

# Check services
docker ps -a       # Check containers
sudo systemctl status docker nginx

# Check app
curl -I https://kandes.shop
curl -I https://api.kandes.shop/v1/models

# Check logs
docker logs --tail 50 kandes-app
```

### Step 8: Re-register GitHub Actions runner (nếu cần)

```bash
# SSH vào EC2
cd ~/actions-runner
sudo ./svc.sh stop
sudo ./svc.sh uninstall
cd ..
rm -rf ~/actions-runner

# Re-download và config (theo D61 setup)
mkdir actions-runner && cd actions-runner
curl -o actions-runner-linux-x64-2.311.0.tar.gz -L https://github.com/actions/runner/releases/download/v2.311.0/actions-runner-linux-x64-2.311.0.tar.gz
tar xzf ./actions-runner-linux-x64-2.311.0.tar.gz

# Lấy token mới từ GitHub repo Settings → Actions → Runners → New self-hosted runner
./config.sh --url https://github.com/<user>/kandes-shop --token <NEW_TOKEN>
sudo ./svc.sh install
sudo ./svc.sh start
```

### Step 9: Trigger test deployment (5 phút)

```bash
# Trigger workflow từ GitHub UI
# Actions → deploy-prod.yml → Run workflow → Branch: main
```

Monitor logs, verify:
- Build pass (typecheck + lint có thể skip nếu D61 chưa fix)
- Docker push to ECR OK
- EC2 receive signal OK
- Container restart OK
- Health check 200 OK
- Smoke test 200 OK

---

## 3. Post-migration verification

### Performance benchmark (optional):

```bash
# Trên EC2 mới (m7i-flex.large)
# 1. Build time
time npm run build
# Expected: ~2-3 phút (vs ~15-20 phút trên t3.micro)

# 2. Memory test
stress-ng --vm 2 --vm-bytes 6G --timeout 60s
# Should not OOM

# 3. Concurrent connections
ab -n 1000 -c 100 https://kandes.shop/
# Should handle 100 concurrent

# 4. AI streaming test
time curl -X POST https://api.kandes.shop/v1/chat/completions \
  -H "Authorization: Bearer $TEST_KEY" \
  -d '{"model":"kandes-gpt-4o","messages":[{"role":"user","content":"hi"}],"stream":true}'
# Should start streaming within 500ms
```

### Cost monitoring (FIRST WEEK):

```bash
# Check AWS billing dashboard
# Or CLI:
aws ce get-cost-and-usage \
  --time-period Start=2026-08-07,End=2026-08-14 \
  --granularity DAILY \
  --metrics "BlendedCost" "UsageQuantity"
```

Nếu cost > $30/week ($120/month projection) → downgrade.

### Watch for:
- Idle CPU (< 10% trong 24h) → over-provisioned, consider downgrade t3.small
- OOM errors → upgrade RAM hoặc add swap
- Connection timeouts → check security group + NACL

---

## 4. Rollback plan

Nếu có vấn đề, rollback về t3.micro:

```bash
# Stop instance
aws ec2 stop-instances --instance-id i-XXXXX

# Change back to t3.micro
aws ec2 modify-instance-attribute \
  --instance-id i-XXXXX \
  --instance-type "{"Value": "t3.micro"}"

# Start
aws ec2 start-instances --instance-id i-XXXXX

# Re-associate EIP
aws ec2 associate-address \
  --instance-id i-XXXXX \
  --allocation-id eipalloc-XXXXX

# Verify
curl -I https://kandes.shop
```

⚠️ **Lưu ý:** Rollback chỉ khả thi nếu account VẪN còn Free plan eligible cho t3.micro. Nếu đã dùng hết credits → t3.micro sẽ charge pay-as-you-go ($9.6/mo).

---

## 5. Cost comparison (30-day estimate)

| Instance | Hours/day | $/hr | Daily cost | Monthly cost | Credits needed (6mo) |
|----------|-----------|------|------------|--------------|----------------------|
| **t3.micro** | 24 | $0.0132 | $0.32 | $9.6 | ~$58 / 6mo |
| **t3.small** | 24 | $0.0264 | $0.63 | $19 | ~$114 / 6mo |
| **m7i-flex.large** (24/7) | 24 | $0.1197 | $2.87 | $89.7 | ~$538 / 6mo |
| **m7i-flex.large** (auto-stop, 8h/day) | 8 | $0.1197 | $0.96 | $28.7 | ~$172 / 6mo |
| **m7i-flex.large** (manual, 12h/day) | 12 | $0.1197 | $1.44 | $43 | ~$258 / 6mo |

→ **Khuyến nghị:** Bắt đầu 24/7 (1-2 tuần đầu test), nếu cost > $30/week → enable auto-stop.

---

## 6. Timeline ước tính

| Step | Time | Downtime? |
|------|------|-----------|
| 1. Snapshot EBS | 5 min | No |
| 2. Disassociate EIP | 1 min | No (brief) |
| 3. Stop instance | 30s | **Yes (30s)** |
| 4. Change instance type | 30s | Yes |
| 5. Re-associate EIP | 30s | Yes |
| 6. Start instance | 30-60s | Yes |
| 7. Health check | 5 min | Partial |
| 8. Re-register runner | 5 min | No |
| 9. Test deployment | 5 min | No |
| **Total downtime** | **~2-3 min** | |

---

## 7. Khi nào KHÔNG nên migrate

- Đang trong giờ cao điểm (user VN 18:00-23:00)
- Có active deployment đang chạy
- RDS đang backup (check RDS console → Automated backups)
- Notification queue có > 100 pending items
- Ai đó đang test thủ công trên prod

→ Best time: **02:00-04:00 sáng giờ VN** (low traffic).

---

## 8. Communication plan

Trước migration:
- [ ] Gửi telegram message cho user: "Sẽ upgrade lúc XX:XX, downtime ~2 phút"
- [ ] Optional: bật maintenance mode (`NEXT_PUBLIC_MAINTENANCE_MODE=true` trong .env)

Sau migration:
- [ ] Verify tất cả endpoints
- [ ] Gửi telegram: "Migration xong, instance đang chạy m7i-flex.large 8 GB"
- [ ] Update DEPLOY_STATUS.md

---

## 9. References

- AWS docs: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-resize.html
- D62 trong CONTEXT.md §7
- DECISION_LOG.md §5
