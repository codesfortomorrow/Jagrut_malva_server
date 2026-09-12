import 'dotenv/config';
import { isEmail } from 'class-validator';
import { admin, roles, privileges, rolePrivilegeMappings } from './seeds';
import { PrismaClient } from '../src/generated/prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Seed admin default credential
  if (await prisma.admin.count()) {
    console.log('⚠ Skipping seed for `admin`, due to non-empty table');
  } else {
    if (
      isEmail(admin.email) &&
      admin.meta?.create?.passwordHash &&
      admin.meta.create.passwordSalt
    ) {
      await prisma.admin.create({
        data: admin,
      });
    } else {
      console.error(new Error('Invalid default admin credentials found'));
    }
  }

  // Seed roles
  for (const roleData of roles) {
    await prisma.role.upsert({
      where: { name: roleData.name },
      update: {
        description: roleData.description,
        isSystem: roleData.isSystem,
      },
      create: roleData,
    });
  }
  console.log(`✔ Seeded ${roles.length} system roles`);

  // Seed privileges
  for (const privData of privileges) {
    await prisma.privilege.upsert({
      where: { key: privData.key },
      update: {
        label: privData.label,
        description: privData.description,
      },
      create: privData,
    });
  }
  console.log(`✔ Seeded ${privileges.length} privileges`);

  // Seed role-privilege mappings
  const allRoles = await prisma.role.findMany();
  const allPrivileges = await prisma.privilege.findMany();

  const roleMap = new Map(allRoles.map((r) => [r.name, r.id]));
  const privilegeMap = new Map(allPrivileges.map((p) => [p.key, p.id]));

  let totalMappings = 0;
  for (const mapping of rolePrivilegeMappings) {
    const roleId = roleMap.get(mapping.roleName);
    if (!roleId) {
      throw new Error(`Role "${mapping.roleName}" not found for mapping`);
    }

    for (const key of mapping.privilegeKeys) {
      const privilegeId = privilegeMap.get(key);
      if (!privilegeId) {
        throw new Error(`Privilege "${key}" not found for mapping`);
      }

      await prisma.rolePrivilege.upsert({
        where: {
          roleId_privilegeId: {
            roleId,
            privilegeId,
          },
        },
        update: {},
        create: {
          roleId,
          privilegeId,
        },
      });
      totalMappings++;
    }
  }
  console.log(`✔ Seeded ${totalMappings} role-privilege mappings`);
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
