import { Injectable } from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { JwtPayload, UserType } from '@Common';

export type ValidAuthResponse = {
  accessToken: string;
  expiresIn: number;
  type: UserType;
  role: string;
  privilege?: any[];
};

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  private async generateJwt(
    payload: JwtPayload,
    options?: JwtSignOptions,
  ): Promise<{ token: string; expiresIn: number }> {
    const token = await this.jwtService.signAsync(payload, options);
    const { iat, exp } = this.jwtService.decode(token);

    return { token, expiresIn: exp - iat };
  }

  async login(
    userId: number,
    type: UserType,
    role: string,
    privilege: any[],
  ): Promise<ValidAuthResponse> {
    const { token, expiresIn } = await this.generateJwt({
      sub: userId,
      type,
      role,
    });
    return {
      accessToken: token,
      expiresIn,
      type,
      role,
      privilege,
    };
  }
}
