import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { OtpTransport, User, UserType } from '@prisma/client';
import { JwtPayload } from '@Common';
import { appConfigFactory } from '@Config';
import { SendCodeRequestType } from './dto';
import { UsersService } from '../users';
import { OtpService, SendCodeResponse, VerifyCodeResponse } from '../otp';

export type ValidAuthResponse = {
  accessToken: string;
  type: UserType;
};

export type InvalidVerifyCodeResponse = {
  mobile: VerifyCodeResponse;
};

@Injectable()
export class AuthService {
  constructor(
    @Inject(appConfigFactory.KEY)
    private readonly appConfig: ConfigType<typeof appConfigFactory>,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly otpService: OtpService,
  ) {}

  private generateJwt(payload: JwtPayload, options?: JwtSignOptions): string {
    return this.jwtService.sign(payload, options);
  }

  async sendCode(
    target: string,
    transport: OtpTransport,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    type: SendCodeRequestType,
  ): Promise<SendCodeResponse> {
    return await this.otpService.send(target, transport);
  }

  async login(userId: string, type: UserType): Promise<ValidAuthResponse> {
    return {
      accessToken: this.generateJwt({
        sub: userId,
        type,
      }),
      type,
    };
  }

  async registerUser(
    firstname: string,
    lastname: string,
    email: string,
    password: string,
    mobile?: string,
  ): Promise<ValidAuthResponse> {
    const user = await this.usersService.create(
      firstname,
      lastname,
      email,
      password,
      mobile,
    );

    return {
      accessToken: this.generateJwt({
        sub: user.id,
        type: user.type,
      }),
      type: user.type,
    };
  }

  async forgotPassword(
    email?: string,
    mobile?: string,
  ): Promise<SendCodeResponse> {
    return await this.usersService.sendPasswordResetCode(email, mobile);
  }

  async resetPassword(
    code: string,
    newPassword: string,
    mobile?: string,
    email?: string,
  ): Promise<User> {
    return await this.usersService.resetPassword(
      code,
      newPassword,
      mobile,
      email,
    );
  }
}
