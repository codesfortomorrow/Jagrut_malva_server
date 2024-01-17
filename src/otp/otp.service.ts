import dayjs from 'dayjs';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { Otp, OtpTransport, Prisma } from '@prisma/client';
import { appConfigFactory, otpConfigFactory } from '@Config';
import { UtilsService } from '@Common';
import { PrismaService } from '../prisma';
import {
  MailService,
  RegisterVerificationCodeMailTemplate,
  ResetPasswordVerificationCodeMailTemplate,
} from '../mail';

export type SendCodeResponse = {
  sentAt: Date;
  timeout: number;
  attempt: number;
  maxAttempt: number;
};

export type VerifyCodeResponse = {
  status: boolean;
  retries: number;
  maxRetries: number;
};

export enum OtpContext {
  Register = 'register',
  ResetPassword = 'reset_password',
}

type OtpSmsParams = {
  code: string;
  expirationTime: string;
};

type OtpMailParams = {
  subject: string;
  template: OtpMailTemplate;
};

type OtpTransportPayload = { context: OtpContext } & (
  | {
      transport: typeof OtpTransport.Email;
      transportParams: { username: string };
    }
  | {
      transport: typeof OtpTransport.Mobile;
    }
);

type OtpMailTemplate =
  | RegisterVerificationCodeMailTemplate
  | ResetPasswordVerificationCodeMailTemplate;

@Injectable()
export class OtpService {
  constructor(
    @Inject(appConfigFactory.KEY)
    private readonly appConfig: ConfigType<typeof appConfigFactory>,
    @Inject(otpConfigFactory.KEY)
    private readonly config: ConfigType<typeof otpConfigFactory>,
    private readonly prisma: PrismaService,
    private readonly utilsService: UtilsService,
    private readonly mailService: MailService,
  ) {}

  private blockError(target: string, blockTimeout: number): Error {
    const duration = this.utilsService.msToHuman(blockTimeout, {
      maxUnit: 'hour',
    });
    return new Error(
      `${target} temporary blocked for ${duration}, due to max wrong attempts or failed retries`,
    );
  }

  private generateCode(length: number): string {
    if (!this.utilsService.isProductionApp()) {
      return this.config.default;
    }

    const chars = '0123456789';
    let code = '';
    for (let i = 0; i < length; i++) {
      code += chars[Math.floor(Math.random() * 10)];
    }
    return code;
  }

  private isBlockTimeout(lastSentAt: Date, blockTimeout: number): boolean {
    return dayjs().isAfter(dayjs(lastSentAt).add(blockTimeout, 'ms'));
  }

  private isTimeout(lastSentAt: Date, timeout: number): boolean {
    return dayjs().isAfter(dayjs(lastSentAt).add(timeout, 'ms'));
  }

  private async find(
    target: string,
    transport: OtpTransport,
  ): Promise<Otp | null> {
    return await this.prisma.otp.findUnique({
      where: {
        transport_target: {
          transport,
          target: target.toLowerCase(), // Can be email address as well
        },
      },
    });
  }

  private async update(
    target: string,
    transport: OtpTransport,
    data: Prisma.OtpUpdateInput,
  ): Promise<Otp> {
    return await this.prisma.otp.update({
      data,
      where: {
        transport_target: {
          transport,
          target: target.toLowerCase(),
        },
      },
    });
  }

  // TODO: Configure sms gateway to send an sms
  private async sendSMS(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    target: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    params: OtpSmsParams,
  ): Promise<void> {
    if (!this.utilsService.isProductionApp()) return;
  }

  private async sendEmail(
    target: string,
    params: OtpMailParams,
  ): Promise<void> {
    if (!this.utilsService.isProductionApp()) return;

    await this.mailService.send({
      to: target,
      subject: params.subject,
      mailBodyOrTemplate: params.template,
    });
  }

  private getContextMailParams(args: {
    context: OtpContext;
    code: string;
    timeout: number;
    username: string;
  }): OtpMailParams {
    const data = {
      username: args.username,
      code: args.code,
      expirationTime: this.utilsService.msToHuman(args.timeout),
    };

    switch (args.context) {
      case OtpContext.Register:
        return {
          subject: 'Sign up verification code',
          template: {
            name: 'register-verification-code',
            data,
          },
        };
      case OtpContext.ResetPassword:
        return {
          subject: 'Reset password verification code',
          template: {
            name: 'reset-password-verification-code',
            data,
          },
        };
      default:
        throw new Error('Unknown otp context found');
    }
  }

  private async sendCodeOnTarget(
    args: {
      target: string;
      code: string;
      timeout: number;
    } & OtpTransportPayload,
  ): Promise<void> {
    if (args.transport === OtpTransport.Mobile) {
      return await this.sendSMS(args.target, {
        code: args.code,
        expirationTime: this.utilsService.msToHuman(args.timeout),
      });
    }

    if (args.transport === OtpTransport.Email) {
      return await this.sendEmail(
        args.target,
        this.getContextMailParams({
          context: args.context,
          code: args.code,
          timeout: args.timeout,
          username: args.transportParams.username,
        }),
      );
    }
  }

  async send(
    args: { target: string } & OtpTransportPayload,
    overrides?: {
      length?: number;
      maxAttempt?: number;
      timeout?: number;
      blockTimeout?: number;
    },
  ): Promise<SendCodeResponse> {
    const config = {
      ...this.config,
      length: overrides?.length || this.config.length,
      maxAttempt: overrides?.maxAttempt || this.config.maxAttempt,
      timeout: overrides?.timeout || this.config.timeout,
      blockTimeout: overrides?.blockTimeout || this.config.blockTimeout,
    };

    let otp = await this.find(args.target, args.transport);

    if (!otp) {
      const code =
        args.transport === OtpTransport.Mobile
          ? this.config.default
          : this.generateCode(config.length);
      otp = await this.prisma.otp.create({
        data: {
          code,
          lastSentAt: new Date(),
          target: args.target.toLowerCase(),
          transport: args.transport,
        },
      });
      await this.sendCodeOnTarget({
        context: args.context,
        target: args.target,
        code,
        timeout: config.timeout,
        ...(args.transport === OtpTransport.Email
          ? { transport: args.transport, transportParams: args.transportParams }
          : { transport: args.transport }),
      });
    } else {
      const isBlockTimeout = this.isBlockTimeout(
        otp.lastSentAt,
        config.blockTimeout,
      );

      if (otp.blocked && !isBlockTimeout) {
        throw this.blockError(args.target, config.blockTimeout);
      }

      if (
        !this.isTimeout(otp.lastSentAt, config.timeout) &&
        !otp.lastCodeVerified
      ) {
        throw new Error(
          `Resend verification code on ${
            args.target
          } not allowed with in ${this.utilsService.msToHuman(config.timeout)}`,
        );
      }

      if (isBlockTimeout || otp.lastCodeVerified) {
        otp.attempt = 0;
      }

      if (config.maxAttempt - otp.attempt === 0) {
        await this.update(args.target, args.transport, { blocked: true });
        throw this.blockError(args.target, config.blockTimeout);
      }

      const code = this.generateCode(config.length);
      otp = await this.update(args.target, args.transport, {
        code,
        lastSentAt: new Date(),
        attempt: otp.attempt + 1,
        retries: 0,
        blocked: false,
        lastCodeVerified: false,
      });
      await this.sendCodeOnTarget({
        context: args.context,
        target: args.target,
        code,
        timeout: config.timeout,
        ...(args.transport === OtpTransport.Email
          ? { transport: args.transport, transportParams: args.transportParams }
          : { transport: args.transport }),
      });
    }

    return {
      sentAt: otp.lastSentAt,
      timeout: config.timeout,
      attempt: otp.attempt,
      maxAttempt: config.maxAttempt,
    };
  }

  async verify(
    code: string,
    target: string,
    transport: OtpTransport,
    overrides?: {
      maxRetries?: number;
      timeout?: number;
      blockTimeout?: number;
    },
  ): Promise<VerifyCodeResponse> {
    const config = {
      ...this.config,
      maxRetries: overrides?.maxRetries || this.config.maxRetries,
      timeout: overrides?.timeout || this.config.timeout,
      blockTimeout: overrides?.blockTimeout || this.config.blockTimeout,
    };

    let otp = await this.find(target, transport);

    if (!otp) {
      throw new Error(`No verification code sent on ${target}`);
    }

    if (otp.blocked) {
      throw this.blockError(target, config.blockTimeout);
    }

    if (this.isTimeout(otp.lastSentAt, config.timeout)) {
      throw new Error(`Verification code for ${target} expired, Try resend`);
    }

    const isMatched = code === otp.code;

    if (!isMatched) {
      otp.retries += 1;

      otp = await this.update(target, transport, {
        retries: otp.retries,
        blocked: config.maxRetries - otp.retries === 0,
      });
    } else {
      otp = await this.update(target, transport, {
        lastCodeVerified: true,
      });
    }

    return {
      status: isMatched,
      retries: otp.retries,
      maxRetries: config.maxRetries,
    };
  }
}
