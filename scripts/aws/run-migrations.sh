#!/bin/bash
cd /opt/kandes
DB_URL=$(grep DATABASE_URL .env | cut -d= -f2-)
# Run as root inside container to access prisma binary
sudo docker exec -u root -e DATABASE_URL="$DB_URL" kandes-app npx prisma migrate deploy 2>&1
