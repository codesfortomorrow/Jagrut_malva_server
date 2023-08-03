import Redis from 'ioredis';
import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import * as configs from '@Config';
import { MAIL_QUEUE } from './common.constants';
import { validateEnvironmentVariables } from './utils';
import * as providers from './providers';
import * as processors from './processors';
import { JwtStrategy } from './strategies';
import { EnvironmentVariables } from './types';

const commonProviders = [...Object.values(providers), JwtStrategy];

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: Object.values(configs),
      validate: validateEnvironmentVariables,
    }),
    BullModule.forRootAsync({
      useFactory: (
        configService: ConfigService<EnvironmentVariables, true>,
      ) => ({
        connection: new Redis(configService.get('REDIS_URI'), {
          maxRetriesPerRequest: null,
        }),
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({ name: MAIL_QUEUE }),
  ],
  providers: [...commonProviders, ...Object.values(processors)],
  exports: commonProviders,
})
export class CommonModule {}
