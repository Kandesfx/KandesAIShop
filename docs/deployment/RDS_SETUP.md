# Kandes.shop — RDS Primary Setup

> **Mục đích:** Consolidate primary DB sang RDS Postgres `kandes-db`, xóa container postgres.
>
> **User quyết định:** 2026-08-10 — chọn RDS.
>
> **Status:** Scripts ready (`scripts/aws/setup-rds-primary.sh`), compose đã cleanup.

---

## 1. Tại sao RDS?

| Tiêu chí | RDS Postgres | Container postgres (cũ) |
|----------|--------------|--------------------------|
| Cost | ~$15/mo (db.t3.micro, 20 GB) | $0 (chạy chung EC2) |
| Backup | AWS-managed (auto snapshot nếu enable) | Phải tự `pg_dump` → S3 |
| High availability | Multi-AZ option ($$$) | EC2 chết → DB chết |
| Restart khi crash | Auto | Phải tự `docker restart` |
| Monitoring | CloudWatch metrics built-in | Phải tự setup |
| Security patching | AWS-managed | Phải tự rebuild image |

**Lý do chọn RDS:** Shop bán hàng + bán AI API → data là tài sản quan trọng. $15/mo là chi phí chấp nhận được để có managed service.

---

## 2. RDS hiện tại (verified 2026-08-10 qua MCP)

| Field | Value |
|-------|-------|
| DB instance ID | `kandes-db` |
| Engine | `postgres` |
| Class | `db.t3.micro` (Free Tier eligible) |
| Allocated storage | 20 GB |
| Endpoint | `kandes-db.crmca6kou3xz.ap-southeast-1.rds.amazonaws.com:5432` |
| Multi-AZ | `false` |
| Publicly accessible | `false` (chỉ EC2 trong VPC access) |
| Status | `available` |

---

## 3. Setup steps

### 3.1. Verify RDS Security Group allow EC2 SG inbound 5432

```bash
# Check RDS SG
aws rds describe-db-instances \
  --db-instance-identifier kandes-db \
  --region ap-southeast-1 \
  --query 'DBInstances[0].VpcSecurityGroups[0].VpcSecurityGroupId'

# Check rule (output SG ID từ command trên)
aws ec2 describe-security-groups \
  --group-ids <RDS_SG_ID> \
  --region ap-southeast-1 \
  --query 'SecurityGroups[0].IpPermissions[?FromPort==`5432`]'
```

**Nếu KHÔNG có rule** cho phép EC2 SG `sg-0748ca482f2f9f073` truy cập port 5432, thêm:

```bash
aws ec2 authorize-security-group-ingress \
  --group-id <RDS_SG_ID> \
  --protocol tcp --port 5432 \
  --source-group sg-0748ca482f2f9f073 \
  --region ap-southeast-1
```

### 3.2. Update DATABASE_URL (2 chỗ)

**Chỗ A — GitHub Secret** (cho deploy workflow):

1. Mở: `https://github.com/Kandesfx/KandesAIShop/settings/secrets/actions`
2. Click `DATABASE_URL` → `Update`
3. New value:
   ```
   postgresql://kandes:<PASSWORD>@kandes-db.crmca6kou3xz.ap-southeast-1.rds.amazonaws.com:5432/kandes_shop?schema=public
   ```
   (Lấy password từ Secrets Manager `kandes/DATABASE_URL` — verify bằng `aws secretsmanager get-secret-value --secret-id kandes/DATABASE_URL --region ap-southeast-1 --query 'SecretString'`)

**Chỗ B — `/opt/kandes/.env` trên EC2**:

```bash
ssh ec2-user@13.215.39.207
sudo nano /opt/kandes/.env
# Tìm dòng DATABASE_URL=... và thay bằng giá trị RDS
```

### 3.3. Apply Prisma migrations lên RDS

```bash
# Trên EC2 (recommended — RDS reachable via VPC)
cd /opt/kandes
docker compose run --rm app npx prisma migrate deploy
```

Hoặc local (cần public IP or VPN):
```bash
DATABASE_URL='postgresql://kandes:***@kandes-db.crmca6kou3xz.ap-southeast-1.rds.amazonaws.com:5432/kandes_shop?schema=public' \
  npx prisma migrate deploy
```

### 3.4. Trigger deploy (apply RDS connection)

Sau khi update DATABASE_URL, push 1 commit dummy:
```bash
git commit --allow-empty -m "chore: trigger deploy after RDS migration"
git push origin main
```

Workflow sẽ:
1. Build image (GitHub-hosted)
2. Pull image (EC2 self-hosted)
3. `prisma migrate deploy` → chạy trên RDS (vì DATABASE_URL trỏ RDS)
4. `docker compose up -d app` → app connect RDS thông qua VPC
5. Health check + smoke test

### 3.5. Verify

```bash
# Health endpoint
curl -s https://kandes.shop/api/health | jq .

# Container logs (không có error ECONNREFUSED db:5432)
docker logs kandes-app --tail 50

# RDS connections metric (should show ~1)
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS --metric-name DatabaseConnections \
  --dimensions Name=DBInstanceIdentifier,Value=kandes-db \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 --statistics Average --region ap-southeast-1
```

---

## 4. Cleanup container postgres (sau 1-2 ngày verify OK)

### 4.1. (Optional) Stop RDS — KHÔNG, vì giờ RDS là primary. Skip.

### 4.2. Remove commented-out `db` service khỏi compose

Đã comment sẵn trong commit này (Docker compose skip commented blocks). Sau khi verify RDS ổn định 1-2 tuần, có thể xóa hẳn để file gọn.

### 4.3. (Optional) Drop docker volume `kandes-postgres-data`

```bash
docker volume rm kandes-postgres-data
```

---

## 5. Rollback nếu RDS down

Trường hợp RDS unavailable (AWS outage, network issue), rollback về container postgres:

```bash
ssh ec2-user@13.215.39.207

# 1. Stop app
cd /opt/kandes
docker compose stop app nginx

# 2. Uncomment `db` service + `postgres-data` volume
sudo nano docker-compose.yml
# Bỏ comment khối `db:` và `postgres-data:`
# Bỏ comment `depends_on: db:` trong `app:` service

# 3. Đổi DATABASE_URL về container
sudo nano .env
# DATABASE_URL=postgresql://kandes:<password>@db:5432/kandes_shop?schema=public

# 4. Start lại
docker compose up -d
docker compose exec app npx prisma migrate deploy
```

Lưu ý: Dữ liệu trong RDS KHÔNG tự động sync sang container. Phải `pg_dump` từ RDS trước, restore vào container.

---

## 6. References

- `scripts/aws/setup-rds-primary.sh` — verification helper script
- `docker-compose.yml` — đã comment `db` service (D70)
- `CURRENT_STATE.md` §2 — RDS state hiện tại
- `DECISION_LOG.md` — RDS lần đầu được setup Phase 7-H (D60)
- `CONTEXT.md` §7 — D70 deviation