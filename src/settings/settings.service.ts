import _ from 'lodash';
import { Injectable } from '@nestjs/common';
import {
  Prisma,
  Setting,
  SettingContext,
  SettingOption,
  SettingType,
  UserSetting,
} from '@prisma/client';
import { PrismaService } from '../prisma';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserSettings(
    userId: string,
    type?: string,
  ): Promise<
    (Setting & {
      options: SettingOption[];
      selection: Prisma.JsonValue | null;
    })[]
  > {
    // TODO: Need to add sub settings using recursion strategy
    const defaultSettings = await this.prisma.setting.findMany({
      include: {
        options: true,
      },
      where: {
        context: SettingContext.User,
        parentId: null,
        mappedTo: type ? { contains: type } : undefined,
      },
    });

    const userSettings = await this.prisma.userSetting.findMany({
      where: { userId },
    });

    // TODO: Need to map user settings with sub settings
    return defaultSettings.map((defaultSetting) => {
      const userSetting = _.find(
        userSettings,
        (userSetting) => userSetting.settingId === defaultSetting.id,
      );

      if (!userSetting) {
        return { ...defaultSetting, selection: null };
      }

      return { ...defaultSetting, selection: userSetting.selection };
    });
  }

  private async upsertUserSetting(
    userId: string,
    settingId: number,
    selection: Prisma.InputJsonValue,
  ): Promise<UserSetting> {
    return await this.prisma.userSetting.upsert({
      where: {
        userId_settingId: {
          userId,
          settingId,
        },
      },
      update: { selection },
      create: {
        selection,
        user: {
          connect: { id: userId },
        },
        setting: {
          connect: { id: settingId },
        },
      },
    });
  }

  async updateUserSetting(
    userId: string,
    settingId: number,
    enable?: boolean,
    selection?: string,
    selections?: string[],
  ): Promise<UserSetting> {
    // TODO: Need to add sub settings using recursion strategy
    const setting = await this.prisma.setting.findUnique({
      include: {
        options: true,
      },
      where: { id: settingId },
    });
    if (!setting) {
      throw new Error('Setting does not exist');
    }

    if (setting.type === SettingType.Binary && typeof enable === 'boolean') {
      return await this.upsertUserSetting(userId, settingId, enable);
    }

    if (
      setting.type === SettingType.SingleSelect &&
      typeof selection === 'string'
    ) {
      if (setting.isDefinedOptions) {
        const settingOptions = setting.options;

        if (!_.some(settingOptions, { id: Number(selection) })) {
          throw new Error('Invalid setting option selection');
        }

        return await this.upsertUserSetting(
          userId,
          settingId,
          Number(selection),
        );
      } else {
        // TODO: Need to handle dynamic setting options
      }
    }

    if (
      setting.type === SettingType.MultiSelect &&
      selections instanceof Array
    ) {
      if (setting.isDefinedOptions) {
        const settingOptions = setting.options;

        selections.forEach((selection) => {
          if (!_.some(settingOptions, { id: Number(selection) })) {
            throw new Error('Invalid setting option selection');
          }
        });

        return await this.upsertUserSetting(
          userId,
          settingId,
          selections.map((selection) => Number(selection)),
        );
      } else {
        // TODO: Need to handle dynamic setting options
      }
    }

    throw new Error('Unknown error');
  }
}
