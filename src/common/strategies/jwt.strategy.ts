import { Request } from 'express';
import { URL } from 'node:url';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { jwtConfigFactory } from '@Config';
import { AuthenticatedUser, JwtPayload } from '../types';
import { JWT_AUTH } from '../common.constants';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, JWT_AUTH) {
  constructor(
    @Inject(jwtConfigFactory.KEY)
    config: ConfigType<typeof jwtConfigFactory>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        JwtStrategy.fromCookie,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: config.secret,
    });
  }

  private static fromCookie(req: Request): string | null {
    if (req.headers.referer) {
      const requestedDomain = new URL(req.headers.referer).host;

      if (
        process.env.ADMIN_WEB_URL &&
        requestedDomain === new URL(process.env.ADMIN_WEB_URL).host &&
        req.cookies &&
        '__adminAuthToken' in req.cookies
      ) {
        return req.cookies['__adminAuthToken'];
      }
    }

    return null;
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    return {
      id: payload.sub,
      type: payload.type,
    };
  }
}
