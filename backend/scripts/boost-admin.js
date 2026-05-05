require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.update({
    where: { email: 'isabella.kwon.mun@gmail.com' },
    data: { xp_bonus: 80000 },
  });
  const level = Math.floor(80000 / 200) + 1;
  console.log(`Done! ${user.email} is now Level ${level}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
