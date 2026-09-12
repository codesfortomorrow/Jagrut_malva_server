import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma';
import { PrivilegesController } from './privileges.controller';
import { PrivilegesService } from './privileges.service';

@Module({
  imports: [PrismaModule],
  controllers: [PrivilegesController],
  providers: [PrivilegesService],
  exports: [PrivilegesService],
})
export class PrivilegesModule {}
