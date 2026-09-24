import { Inject, UnprocessableEntityException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigType } from '@nestjs/config';
import { Profile, Strategy, VerifyCallback } from 'passport-google-oauth20';
import { appConfigFactory, googleConfigFactory } from '@Config';
import { GOOGLE_OAUTH } from '../auth.constants';

export class GoogleStrategy extends PassportStrategy(Strategy, GOOGLE_OAUTH) {
  constructor(
    @Inject(appConfigFactory.KEY)
    appConfig: ConfigType<typeof appConfigFactory>,
    @Inject(googleConfigFactory.KEY)
    config: ConfigType<typeof googleConfigFactory>,
  ) {
    super({
      clientID: config.oauth.clientId as string,
      clientSecret: config.oauth.secret as string,
      scope: config.oauth.scope,
      callbackURL: `${appConfig.serverUrl}/auth/google/callback`,
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<void> {
    return;
  }
}
