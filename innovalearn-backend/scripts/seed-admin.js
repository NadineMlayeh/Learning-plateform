const { PrismaClient, Role } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL && process.env.ADMIN_EMAIL.trim();
  const password = process.env.ADMIN_PASSWORD;
  const name = (process.env.ADMIN_NAME && process.env.ADMIN_NAME.trim()) || 'Admin';
  const phoneNumber =
    (process.env.ADMIN_PHONE && process.env.ADMIN_PHONE.trim()) || '+10000000000';

  if (!email || !password) {
    console.log('[seed-admin] ADMIN_EMAIL or ADMIN_PASSWORD not set. Skipping admin seed.');
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { email },
    update: {
      name,
      phoneNumber,
      password: hashedPassword,
      role: Role.ADMIN,
      formateurStatus: null,
      isSuspended: false,
    },
    create: {
      email,
      password: hashedPassword,
      name,
      phoneNumber,
      role: Role.ADMIN,
      formateurStatus: null,
    },
  });

  console.log(`[seed-admin] Admin account ready for ${email}`);
}

main()
  .catch((error) => {
    console.error('[seed-admin] Failed to seed admin account', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
