import {
  Req,
  Res,
  Controller,
  Post,
  UseGuards,
  HttpCode,
  Inject,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { CookieOptions, Request, Response } from 'express';
import { ConfigType } from '@nestjs/config';
import { OtpTransport, UserType } from '@prisma/client';
import {
  AuthenticatedRequest,
  BaseController,
  JwtAuthGuard,
  UtilsService,
  ValidatedUser,
} from '@Common';
import { appConfigFactory, authConfigFactory } from '@Config';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards';
import {
  ForgotPasswordRequestDto,
  RegisterUserRequestDto,
  ResetPasswordRequestDto,
  SendCodeRequestDto,
} from './dto';

@Controller('auth')
export class AuthController extends BaseController {
  constructor(
    @Inject(appConfigFactory.KEY)
    private readonly appConfig: ConfigType<typeof appConfigFactory>,
    @Inject(authConfigFactory.KEY)
    private readonly config: ConfigType<typeof authConfigFactory>,
    private readonly authService: AuthService,
    private readonly utilsService: UtilsService,
  ) {
    super();
  }

  private setCookie(
    res: Response,
    key: string,
    value: string,
    options?: CookieOptions,
  ): void {
    const isProduction = this.utilsService.isProduction();
    res.cookie(key, value, {
      expires: options?.expires,
      domain:
        options?.domain !== undefined
          ? options.domain
          : isProduction
          ? this.appConfig.domain
          : 'localhost',
      httpOnly: options?.httpOnly !== undefined ? options.httpOnly : true,
      sameSite:
        options?.sameSite !== undefined
          ? options.sameSite
          : isProduction
          ? 'strict'
          : 'none',
      secure: options?.secure !== undefined ? options.secure : true,
    });
  }

  private removeCookie(
    res: Response,
    key: string,
    options?: CookieOptions,
  ): void {
    const isProduction = this.utilsService.isProduction();
    res.clearCookie(key, {
      domain:
        options?.domain !== undefined
          ? options.domain
          : isProduction
          ? this.appConfig.domain
          : 'localhost',
      httpOnly: options?.httpOnly !== undefined ? options.httpOnly : true,
      sameSite:
        options?.sameSite !== undefined
          ? options.sameSite
          : isProduction
          ? 'strict'
          : 'none',
      secure: options?.secure !== undefined ? options.secure : true,
    });
  }

  private setAuthCookie(
    res: Response,
    accessToken: string,
    userType: UserType,
  ): void {
    const expirationTime = this.config.authCookieExpirationTime();

    this.setCookie(
      res,
      `__${userType.toLocaleLowerCase()}AuthToken`,
      accessToken,
      {
        expires: expirationTime,
        httpOnly: true,
      },
    );

    this.setCookie(res, `${userType.toLocaleLowerCase()}LoggedIn`, 'true', {
      expires: expirationTime,
      httpOnly: false,
    });
  }

  private async register(data: RegisterUserRequestDto) {
    return await this.authService.registerUser(
      data.firstname,
      data.lastname,
      data.email,
      data.password,
      data.mobile,
    );
  }

  @Post('send-code')
  async sendCode(@Body() data: SendCodeRequestDto) {
    if (data.email) {
      return await this.authService.sendCode(
        data.email,
        OtpTransport.Email,
        data.type,
      );
    }

    if (data.mobile) {
      return await this.authService.sendCode(
        data.mobile,
        OtpTransport.Mobile,
        data.type,
      );
    }
  }

  @Post('web/register')
  async webRegisterUser(
    @Res({ passthrough: true }) res: Response,
    @Body() data: RegisterUserRequestDto,
  ) {
    const { accessToken, type } = await this.register(data);
    this.setAuthCookie(res, accessToken, type);
    return { status: 'success' };
  }

  @Post('native/register')
  async nativeRegisterUser(@Body() data: RegisterUserRequestDto) {
    return await this.register(data);
  }

  @UseGuards(LocalAuthGuard)
  @HttpCode(200)
  @Post('web/login')
  async webLogin(
    @Req() req: Request & { user: ValidatedUser },
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, type } = await this.authService.login(
      req.user.id,
      req.user.type,
    );
    this.setAuthCookie(res, accessToken, type);
    return { status: 'success' };
  }

  @UseGuards(LocalAuthGuard)
  @HttpCode(200)
  @Post('native/login')
  async nativeLogin(@Req() req: Request & { user: ValidatedUser }) {
    return await this.authService.login(req.user.id, req.user.type);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ctx = this.getContext(req);
    this.removeCookie(res, `__${ctx.user.type.toLocaleLowerCase()}AuthToken`, {
      httpOnly: true,
    });
    this.removeCookie(res, `${ctx.user.type.toLocaleLowerCase()}LoggedIn`, {
      httpOnly: true,
    });
    return { status: 'success' };
  }

  @Post('forgot-password')
  @HttpCode(200)
  async forgotPassword(@Body() data: ForgotPasswordRequestDto) {
    if (!data.email && !data.mobile) throw BadRequestException;
    return await this.authService.forgotPassword(data.email, data.mobile);
  }

  @Post('reset-password')
  @HttpCode(200)
  async resetPassword(@Body() data: ResetPasswordRequestDto) {
    if (!data.email && !data.mobile) throw new BadRequestException();
    await this.authService.resetPassword(
      data.code,
      data.newPassword,
      data.mobile,
      data.email,
    );
    return { status: 'success' };
  }
}
