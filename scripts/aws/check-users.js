const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findFirst();
    console.log('First user:', JSON.stringify(user, null, 2));
    
    // Check aiApiKeys
    const keys = await prisma.aiApiKey.findMany({ take: 5 });
    console.log('\nAI API Keys:', JSON.stringify(keys, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
