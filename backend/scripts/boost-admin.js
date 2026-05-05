/**
 * One-time script: gives isabella.kwon.mun@gmail.com enough XP to reach level 400.
 * Level formula: floor(xpTotal / 200) + 1
 * Each passed submission = 60 XP (40 base + 20 pass bonus)
 * Need 79800 XP for level 400 → 1330 passed submissions
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const TARGET_EMAIL = 'isabella.kwon.mun@gmail.com';
const NEEDED = 1330;

async function main() {
  const user = await prisma.user.findUnique({ where: { email: TARGET_EMAIL } });
  if (!user) { console.error('User not found:', TARGET_EMAIL); process.exit(1); }

  const existing = await prisma.submission.count({ where: { created_by: TARGET_EMAIL } });
  const toCreate = Math.max(0, NEEDED - existing);
  console.log(`Existing submissions: ${existing}, creating ${toCreate} more`);

  if (toCreate === 0) { console.log('Already at target.'); return; }

  const BATCH = 100;
  for (let i = 0; i < toCreate; i += BATCH) {
    const size = Math.min(BATCH, toCreate - i);
    await prisma.submission.createMany({
      data: Array.from({ length: size }, (_, j) => ({
        title: `Admin XP Boost #${existing + i + j + 1}`,
        subject: 'other',
        grade_level: 'n/a',
        type: 'notes',
        status: 'approved',
        quiz_passed: true,
        points_awarded: 0,
        created_by: TARGET_EMAIL,
      })),
    });
    console.log(`Created ${i + size} / ${toCreate}`);
  }

  const total = await prisma.submission.count({ where: { created_by: TARGET_EMAIL } });
  const xp = total * 40 + (await prisma.submission.count({ where: { created_by: TARGET_EMAIL, quiz_passed: true } })) * 20;
  const level = Math.floor(xp / 200) + 1;
  console.log(`Done! Total submissions: ${total}, XP: ${xp}, Level: ${level}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
