import { Prisma } from '../../src/generated/prisma/client';
import { ADMIN_ROLE_NAME } from '../../src/roles/privilege-catalog.constant';

export const admin: Prisma.AdminCreateInput = {
  firstname: '',
  lastname: '',
  role: { connect: { name: ADMIN_ROLE_NAME } },
  email: process.env.ADMIN_EMAIL || '',
  meta: {
    create: {
      passwordSalt: process.env.ADMIN_PASSWORD_SALT || '',
      passwordHash: process.env.ADMIN_PASSWORD_HASH || '',
    },
  },
};
