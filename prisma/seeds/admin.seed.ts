import { Prisma, UserType } from '@prisma/client';

export const admin: Prisma.UserCreateInput = {
  firstname: '',
  lastname: '',
  email: process.env.ADMIN_EMAIL || '',
  type: UserType.Admin,
  meta: {
    create: {
      passwordSalt: process.env.ADMIN_PASSWORD_SALT || '',
      passwordHash: process.env.ADMIN_PASSWORD_HASH || '',
    },
  },
};
