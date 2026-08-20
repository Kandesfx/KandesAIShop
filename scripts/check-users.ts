import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  const users = await db.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      passwordHash: true,
      emailVerifiedAt: true,
      createdAt: true,
    },
  })

  console.log(`\n📋 DANH SÁCH USER TRONG CSDL (${users.length} users):`)
  for (const u of users) {
    console.log(`- Email: ${u.email} | Role: ${u.role} | Status: ${u.status} | HasPassword: ${!!u.passwordHash} | Verified: ${!!u.emailVerifiedAt}`)
  }
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect())
