import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma';
import { DispatchesController } from './dispatches.controller';
import { DispatchesService } from './dispatches.service';
import { DeliveryModule, DeliveryService } from 'src/delivery';

@Module({
  imports: [PrismaModule, DeliveryModule],
  controllers: [DispatchesController],
  providers: [DispatchesService, DeliveryService],
  exports: [DispatchesService],
})
export class DispatchesModule {}
