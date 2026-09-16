import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma';
import { PublishIssuesController } from './publish-issues.controller';
import { PublishIssuesService } from './publish-issues.service';

@Module({
  imports: [PrismaModule],
  controllers: [PublishIssuesController],
  providers: [PublishIssuesService],
  exports: [PublishIssuesService],
})
export class PublishIssuesModule {}
