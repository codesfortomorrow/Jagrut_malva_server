import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { StorageService } from '@Common';
import { PrismaModule } from '../prisma';
import { PublishIssuesController } from './publish-issues.controller';
import { PublishIssuesService } from './publish-issues.service';

@Module({
  imports: [
    PrismaModule,
    MulterModule.registerAsync({
      useFactory: (storageService: StorageService) => ({
        ...storageService.defaultMulterOptions,
      }),
      inject: [StorageService],
    }),
  ],
  controllers: [PublishIssuesController],
  providers: [PublishIssuesService],
  exports: [PublishIssuesService],
})
export class PublishIssuesModule {}
