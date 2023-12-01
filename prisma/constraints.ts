// NOTE: No need to run this script,
// If not using `db:schema:push` script on staging or production env
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Running add constraint script...');

  await prisma.$transaction(async () => {
    await Promise.all([
      // tx.$executeRaw`ALTER TABLE example
      //   ADD CONSTRAINT amount_check CHECK (amount >= 0)
      // ;`,
    ]);
  });

  console.log('✅ The constraints has been added.');
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
