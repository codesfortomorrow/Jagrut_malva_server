import crypto from 'crypto';
import { customAlphabet } from 'nanoid';
import _ from 'lodash';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Environment, EnvironmentVariables } from '../types';

@Injectable()
export class UtilsService {
  constructor(
    private readonly configService: ConfigService<EnvironmentVariables, true>,
  ) {}

  isProduction(): boolean {
    return this.configService.get('NODE_ENV') === Environment.Production;
  }

  generateSalt(length = 16): string {
    return crypto.randomBytes(length).toString('hex');
  }

  hashPassword(data: string, salt: string, length: number): string {
    return crypto.scryptSync(data, salt, length).toString('hex');
  }

  generateRandomToken(length?: number): string {
    const alphabet =
      '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    const nanoid = customAlphabet(alphabet);
    return nanoid(length);
  }

  toEnumValue<T>(value: string | number, capitalize = true): T {
    if (typeof value === 'string' && capitalize) {
      value = _.capitalize(value);
    }
    return value as T;
  }

  exclude<T, Key extends keyof T>(
    obj: T,
    keys: Key[],
    enableClone = false,
  ): Omit<T, Key> {
    if (enableClone) {
      const clone = _.cloneDeep<T>(obj);
      for (const key of keys) {
        delete clone[key];
      }
      return clone;
    } else {
      for (const key of keys) {
        delete obj[key];
      }
      return obj;
    }
  }

  msToDay(ms: number): number {
    return Math.floor(ms / 86400000);
  }

  msToMin(ms: number): number {
    return Math.floor(ms / 60000);
  }

  msToHr(ms: number): number {
    return Math.floor(ms / 3600000);
  }

  msToSec(ms: number): number {
    return Math.floor(ms / 1000);
  }

  msToHuman(
    ms: number,
    options?: {
      maxUnit?: 'day' | 'hour' | 'minute' | 'second';
    },
  ): string {
    options = {
      maxUnit: options?.maxUnit || 'day',
    };

    const dateProperties: Record<string, number> = {};

    if (options.maxUnit === 'day') {
      dateProperties.day = this.msToDay(ms);
      dateProperties.hour = this.msToHr(ms) % 24;
      dateProperties.minute = this.msToMin(ms) % 60;
      dateProperties.second = this.msToSec(ms) % 60;
    }

    if (options.maxUnit === 'hour') {
      dateProperties.hour = this.msToHr(ms);
      dateProperties.minute = this.msToMin(ms) % 60;
      dateProperties.second = this.msToSec(ms) % 60;
    }

    if (options.maxUnit === 'minute') {
      dateProperties.minute = this.msToMin(ms);
      dateProperties.second = this.msToSec(ms) % 60;
    }

    if (options.maxUnit === 'second') {
      dateProperties.second = this.msToSec(ms);
    }

    return Object.entries(dateProperties)
      .filter((val) => val[1] !== 0)
      .map((val) => val[1] + ' ' + (val[1] !== 1 ? val[0] + 's' : val[0]))
      .join(', ');
  }

  async sleep(ms: number) {
    return await new Promise((resolve) => setTimeout(resolve, ms));
  }
}
