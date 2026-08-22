#!/bin/bash
set +e
C=/home/ec2-user/c413.txt
rm -f $C

curl -sS -m 10 -L -c $C -H "Content-Type: application/json" \
  -d '{"email":"admin@kandes.shop","password":"Kandesfox110205@"}' \
  https://kandes.shop/api/auth/login -o /dev/null -w "LOGIN=%{http_code}\n"

# Tạo file 5MB random (giống ảnh to)
dd if=/dev/urandom of=/home/ec2-user/big5.bin bs=1M count=5 2>/dev/null
ls -la /home/ec2-user/big5.bin

echo ""
echo "=== TEST A: qua CloudFront (kandes.shop) - file 5MB ==="
curl -sS -m 30 -b $C -X POST -F "files=@/home/ec2-user/big5.bin" -w "\n=> HTTP=%{http_code} TIME=%{time_total}s\n" https://kandes.shop/api/admin/media/upload 2>&1 | tail -5

echo ""
echo "=== TEST B: bypass CloudFront (thẳng EC2) - file 5MB ==="
curl -sS -m 30 -b $C -X POST -F "files=@/home/ec2-user/big5.bin" -w "\n=> HTTP=%{http_code} TIME=%{time_total}s\n" http://13.215.39.207/api/admin/media/upload 2>&1 | tail -5

echo ""
echo "=== TEST C: 1MB file qua CloudFront ==="
dd if=/dev/urandom of=/home/ec2-user/big1.bin bs=1M count=1 2>/dev/null
curl -sS -m 20 -b $C -X POST -F "files=@/home/ec2-user/big1.bin" -w "\n=> HTTP=%{http_code} TIME=%{time_total}s\n" https://kandes.shop/api/admin/media/upload 2>&1 | tail -5

echo ""
echo "=== TEST D: 2MB file qua CloudFront ==="
dd if=/dev/urandom of=/home/ec2-user/big2.bin bs=1M count=2 2>/dev/null
curl -sS -m 20 -b $C -X POST -F "files=@/home/ec2-user/big2.bin" -w "\n=> HTTP=%{http_code} TIME=%{time_total}s\n" https://kandes.shop/api/admin/media/upload 2>&1 | tail -5

echo ""
echo "=== TEST E: 4MB file qua CloudFront ==="
dd if=/dev/urandom of=/home/ec2-user/big4.bin bs=1M count=4 2>/dev/null
curl -sS -m 30 -b $C -X POST -F "files=@/home/ec2-user/big4.bin" -w "\n=> HTTP=%{http_code} TIME=%{time_total}s\n" https://kandes.shop/api/admin/media/upload 2>&1 | tail -5

rm -f $C /home/ec2-user/big*.bin
