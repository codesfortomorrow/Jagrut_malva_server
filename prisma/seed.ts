import 'dotenv/config';
import { isEmail } from 'class-validator';
import { admin, systemRoles, businessRoles, privileges } from './seeds';
import { ADMIN_ROLE_NAME } from '../src/roles/privilege-catalog.constant';
import { PrismaClient } from '../src/generated/prisma/client';
import { prismaVersion } from 'src/generated/prisma/internal/prismaNamespace';

const prisma = new PrismaClient();

async function main() {
  // ── Admin ───────────────────────────────────────────────────────────────────
  // ── Privileges — upsert from catalog, then prune removed ones ───────────────
  for (const privilege of privileges) {
    await prisma.privilege.upsert({
      where: { key: privilege.key },
      update: {
        module: privilege.module,
        action: privilege.action,
        description: privilege.description,
      },
      create: privilege,
    });
  }

  const { count: pruned } = await prisma.privilege.deleteMany({
    where: { key: { notIn: privileges.map((p) => p.key) } },
  });
  if (pruned > 0) {
    console.log(`✔ Pruned ${pruned} privilege(s) removed from the catalog`);
  }
  console.log(`✔ Seeded ${privileges.length} privileges`);

  // ── System Roles — upsert on every run ──────────────────────────────────────
  for (const roleData of systemRoles) {
    const existing = await prisma.role.findUnique({
      where: { name: roleData.name },
    });

    if (!existing) {
      await prisma.role.create({ data: roleData });
    } else if (roleData.name === ADMIN_ROLE_NAME) {
      for (const privilege of privileges) {
        const found = await prisma.privilege.findUniqueOrThrow({
          where: { key: privilege.key },
        });
        await prisma.rolePrivilege.upsert({
          where: {
            roleId_privilegeId: {
              roleId: existing.id,
              privilegeId: found.id,
            },
          },
          update: {},
          create: { roleId: existing.id, privilegeId: found.id },
        });
      }
    }
  }
  console.log(`✔ Seeded ${systemRoles.length} system roles`);

  // ── Business Roles — create once, never re-sync ─────────────────────────────
  for (const roleData of businessRoles) {
    const existing = await prisma.role.findUnique({
      where: { name: roleData.name },
    });
    if (!existing) {
      await prisma.role.create({ data: roleData });
    }
  }
  console.log(`✔ Seeded ${businessRoles.length} business roles`);

  if (await prisma.admin.count()) {
    console.log('⚠ Skipping seed for `admin`, due to non-empty table');
  } else {
    if (
      isEmail(admin.email) &&
      admin.meta?.create?.passwordHash &&
      admin.meta.create.passwordSalt
    ) {
      await prisma.admin.create({ data: admin });
      const adminRole = await prisma.role.findFirst({
        where: { name: ADMIN_ROLE_NAME },
      });
      if (adminRole) {
        await prisma.userRole.create({
          data: {
            userId: 1,
            roleId: adminRole.id,
          },
        });
      }
      console.log('✔ Admin seeded');
    } else {
      console.error(new Error('Invalid default admin credentials found'));
    }
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
