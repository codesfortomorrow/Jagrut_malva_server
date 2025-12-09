import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MulterModule } from '@nestjs/platform-express';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { CacheModule } from '@nestjs/cache-manager';
import { CommonModule, StorageService, UtilsService } from '@Common';
import { AppController } from './app.controller';
import { AppCacheInterceptor } from './app-cache.interceptor';
import { MetricsInterceptor, MetricsModule, MetricsService } from './metrics';
import { PrismaModule } from './prisma';
import { AuthModule } from './auth';
import { RedisModule } from './redis';

@Module({
  imports: [
    MulterModule.registerAsync({
      useFactory: (storageService: StorageService) => ({
        ...storageService.defaultMulterOptions,
      }),
      inject: [StorageService],
    }),
    CacheModule.register({ isGlobal: true, ttl: 10000 }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    CommonModule,
    MetricsModule,
    PrismaModule,
    RedisModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useFactory: (
        utilsService: UtilsService,
        metricsService: MetricsService,
      ) => {
        if (utilsService.isMetricsEnabled()) {
          return new MetricsInterceptor(metricsService);
        }
      },
      inject: [UtilsService, MetricsService],
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AppCacheInterceptor,
    },
  ],
})
export class AppModule {}
