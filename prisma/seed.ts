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

  // ── Sync All Roles & Privileges according to spec ───────────────────────────
  const allRoles = [...systemRoles, ...businessRoles];
  for (const roleData of allRoles) {
    let role = await prisma.role.findUnique({
      where: { name: roleData.name },
    });

    if (!role) {
      role = await prisma.role.create({
        data: {
          name: roleData.name,
          description: roleData.description,
          type: roleData.type,
          isProtected: roleData.isProtected,
        },
      });
    }

    // Connect privileges specified in roleData
    const targetPrivilegeKeys =
      roleData.name === ADMIN_ROLE_NAME
        ? privileges.map((p) => p.key)
        : (roleData.privileges?.create as any[])?.map(
            (p: any) => p.privilege.connect.key,
          ) || [];

    for (const key of targetPrivilegeKeys) {
      const found = await prisma.privilege.findUnique({
        where: { key },
      });
      if (found) {
        await prisma.rolePrivilege.upsert({
          where: {
            roleId_privilegeId: {
              roleId: role.id,
              privilegeId: found.id,
            },
          },
          update: {},
          create: { roleId: role.id, privilegeId: found.id },
        });
      }
    }
  }
  console.log(`✔ Synced ${allRoles.length} roles and their privileges`);

  if (await prisma.admin.count()) {
    console.log('⚠ Skipping seed for `admin`, due to non-empty table');
  } else {
    if (
      isEmail(admin.email) &&
      admin.meta?.create?.passwordHash &&
      admin.meta.create.passwordSalt
    ) {
      const adminRole = await prisma.role.findFirst({
        where: { name: ADMIN_ROLE_NAME },
      });
      admin.role = { connect: { id: adminRole?.id } };
      await prisma.admin.create({ data: admin });

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
