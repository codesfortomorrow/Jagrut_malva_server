import { SetMetadata } from '@nestjs/common';

export const REQUIRE_PRIVILEGE_KEY = 'require_privilege';

export const RequirePrivilege = (...privileges: string[]) =>
  SetMetadata(REQUIRE_PRIVILEGE_KEY, privileges);
