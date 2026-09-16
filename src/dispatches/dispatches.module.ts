import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma';
import { DispatchesController } from './dispatches.controller';
import { DispatchesService } from './dispatches.service';

@Module({
  imports: [PrismaModule],
  controllers: [DispatchesController],
  providers: [DispatchesService],
  exports: [DispatchesService],
})
export class DispatchesModule {}
