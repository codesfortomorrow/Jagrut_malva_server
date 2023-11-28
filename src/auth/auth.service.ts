import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { OtpTransport, User } from '@prisma/client';
import { JwtPayload, UserType } from '@Common';
import { appConfigFactory } from '@Config';
import { SendCodeRequestType } from './dto';
import { UsersService } from '../users';
import { OtpService, SendCodeResponse, VerifyCodeResponse } from '../otp';

export type ValidAuthResponse = {
  accessToken: string;
  type: UserType;
};

export type InvalidVerifyCodeResponse = {
  email: VerifyCodeResponse;
  mobile?: VerifyCodeResponse;
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

  async registerUser(data: {
    firstname: string;
    lastname: string;
    email: string;
    password: string;
    dialCode?: string;
    mobile?: string;
    country: string;
    emailVerificationCode: string;
    mobileVerificationCode?: string;
  }): Promise<InvalidVerifyCodeResponse | ValidAuthResponse> {
    const [verifyEmailOtpResponse, verifyMobileOtpResponse] = await Promise.all(
      [
        this.otpService.verify(
          data.emailVerificationCode,
          data.email,
          OtpTransport.Email,
        ),
        data.mobile &&
          this.otpService.verify(
            data.mobileVerificationCode || '',
            data.mobile,
            OtpTransport.Mobile,
          ),
      ],
    );
    if (
      !verifyEmailOtpResponse.status ||
      (verifyMobileOtpResponse && !verifyMobileOtpResponse.status)
    ) {
      return {
        email: verifyEmailOtpResponse,
        mobile: verifyMobileOtpResponse || undefined,
      };
    }

    const user = await this.usersService.create({
      firstname: data.firstname,
      lastname: data.lastname,
      email: data.email,
      password: data.password,
      dialCode: data.dialCode,
      mobile: data.mobile,
      country: data.country,
    });
    return {
      accessToken: this.generateJwt({
        sub: user.id,
        type: UserType.User,
      }),
      type: UserType.User,
    };
  }

  async forgotPassword(
    email?: string,
    mobile?: string,
  ): Promise<SendCodeResponse> {
    return await this.usersService.sendResetPasswordVerificationCode(
      email,
      mobile,
    );
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
