const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');

const HASH_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

async function main() {
  const prisma = new PrismaClient();
  try {
    const password = 'Kandesfox110205@';
    const passwordHash = await argon2.hash(password, HASH_OPTIONS);

    const accounts = [
      { email: 'kandesfox@gmail.com', name: 'Kandes Root' },
      { email: 'kandesfox@kandes.shop', name: 'Kandes Root' },
      { email: 'admin@kandes.shop', name: 'Kandes Super Admin' },
    ];

    for (const acc of accounts) {
      const user = await prisma.user.upsert({
        where: { email: acc.email },
        update: {
          passwordHash,
          role: 'super_admin',
          status: 'active',
          emailVerifiedAt: new Date(),
        },
        create: {
          email: acc.email,
          name: acc.name,
          passwordHash,
          role: 'super_admin',
          status: 'active',
          emailVerifiedAt: new Date(),
        },
      });
      console.log(`✅ Root Admin ready: ${user.email} (Role: ${user.role})`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('❌ Error creating root admin:', err);
  process.exit(1);
});
