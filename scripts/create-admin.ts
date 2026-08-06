/**
 * scripts/create-admin.ts — Provision super_admin account ở production hoặc staging.
 *
 * Dùng cho D60 deploy sau khi `prisma migrate deploy` đã chạy và seed đã tạo
 * `admin@kandes.shop` (nếu DB cũ). Ở production, KHÔNG seed — phải tạo admin
 * qua script này để password là giá trị runtime (không hard-code).
 *
 * Usage:
 *   # Local
 *   npx tsx scripts/create-admin.ts \
 *     --email=ops@kandes.shop \
 *     --password='<strong-password>' \
 *     --name="Kandes Ops" \
 *     --role=super_admin
 *
 *   # Trên EC2 (qua secrets / SSM — recommended cách:
 *   read -s ADMIN_PASS && \
 *   ADMIN_EMAIL=ops@kandes.shop ADMIN_PASSWORD=$ADMIN_PASS \
 *   npx tsx scripts/create-admin.ts
 *
 * Idempotent: nếu email đã tồn tại → skip + in cảnh báo (KHÔNG update password
 * — phải dùng reset-password API để tránh lockout).
 *
 * Notes:
 *   - Hash password qua argon2id (memoryCost 19MiB, timeCost 2) — match MASTER_SPEC §4 + BR-4.2.
 *   - Set emailVerifiedAt = now để skip OTP flow.
 *   - KHÔNG log giá trị password ra console.
 */

import { PrismaClient, UserRole } from '@prisma/client'
import { hashPassword } from '../lib/password'

const db = new PrismaClient()

function parseArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (const arg of argv.slice(2)) {
    const match = arg.match(/^--([^=]+)(?:=(.*))?$/)
    if (!match) continue
    out[match[1] ?? arg] = match[2] ?? 'true'
  }
  return out
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv)
  const envEmail = process.env.ADMIN_EMAIL
  const envPassword = process.env.ADMIN_PASSWORD

  const email = (args.email ?? envEmail ?? '').trim().toLowerCase()
  const password = args.password ?? envPassword ?? ''
  const name = args.name ?? 'Kandes Admin'
  const roleArg = args.role ?? 'super_admin'

  if (!email || !password) {
    console.error('Missing required args. Usage:')
    console.error('  npx tsx scripts/create-admin.ts --email=<email> --password=<password>')
    console.error('Or via env:')
    console.error('  ADMIN_EMAIL=<email> ADMIN_PASSWORD=<password> npx tsx scripts/create-admin.ts')
    process.exit(1)
  }

  // Validate role
  const validRoles: UserRole[] = ['customer', 'staff', 'admin', 'super_admin']
  if (!validRoles.includes(roleArg as UserRole)) {
    console.error(`Invalid role. Valid: ${validRoles.join(', ')}`)
    process.exit(1)
  }

  // Idempotent: nếu user đã tồn tại → skip + warn
  const existing = await db.user.findUnique({ where: { email } })
  if (existing) {
    console.warn(`⚠️  User đã tồn tại: ${email} (id=${existing.id}, role=${existing.role})`)
    console.warn('   Không update password — dùng reset-password API để tránh lockout.')
    await db.$disconnect()
    return
  }

  // Hash password (argon2id, không log giá trị)
  const passwordHash = await hashPassword(password)

  const user = await db.user.create({
    data: {
      email,
      passwordHash,
      name,
      role: roleArg as UserRole,
      status: 'active',
      emailVerifiedAt: new Date(),
    },
    select: { id: true, email: true, name: true, role: true },
  })

  console.log(`✅ Admin created:`)
  console.log(`   id    : ${user.id}`)
  console.log(`   email : ${user.email}`)
  console.log(`   name  : ${user.name}`)
  console.log(`   role  : ${user.role}`)
  console.log(`\n⚠️  Đổi password ngay sau lần đăng nhập đầu tiên.`)
}

main()
  .catch((err: unknown) => {
    console.error('❌ create-admin failed:', err)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
