import { PrismaClient } from '@prisma/client';
import { isEmail } from 'class-validator';
import { admin } from './seeds/admin.seed';

const prisma = new PrismaClient();

async function main() {
  // Seed admin default credentials
  if (
    isEmail(admin.email) &&
    admin.meta?.create?.passwordHash &&
    admin.meta.create.passwordSalt
  ) {
    await prisma.user.create({
      data: admin,
    });
  } else {
    console.error(new Error('Invalid default admin credentials found'));
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
