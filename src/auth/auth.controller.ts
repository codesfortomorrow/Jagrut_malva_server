import {
  Req,
  Res,
  Controller,
  Post,
  UseGuards,
  HttpCode,
  Inject,
  Get,
  Redirect,
} from '@nestjs/common';
import { CookieOptions, Request, Response } from 'express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiExcludeEndpoint,
  ApiTags,
} from '@nestjs/swagger';
import { ConfigType } from '@nestjs/config';
import {
  AuthenticatedRequest,
  BaseController,
  JwtAuthGuard,
  UserType,
  UtilsService,
  ValidatedUser,
} from '@Common';
import { appConfigFactory, authConfigFactory } from '@Config';
import { AuthService } from './auth.service';
import { GoogleOAuthGuard, LocalAuthGuard } from './guards';
import { LoginRequestDto } from './dto';

@ApiTags('Auth')
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

  private getCookieOptions(options?: CookieOptions) {
    const isProduction = this.utilsService.isProduction();
    return {
      expires: options?.expires,
      domain:
        options?.domain !== undefined ? options.domain : this.appConfig.domain,
      httpOnly: options?.httpOnly !== undefined ? options.httpOnly : true,
      sameSite:
        options?.sameSite !== undefined
          ? options.sameSite
          : isProduction
            ? 'strict'
            : 'none',
      secure: options?.secure !== undefined ? options.secure : true,
    };
  }

  private setCookie(
    res: Response,
    key: string,
    value: string,
    options?: CookieOptions,
  ): void {
    res.cookie(key, value, this.getCookieOptions(options));
  }

  private removeCookie(
    res: Response,
    key: string,
    options?: CookieOptions,
  ): void {
    res.clearCookie(key, this.getCookieOptions(options));
  }

  private getAuthCookie(ut: UserType) {
    return this.utilsService.getCookiePrefix(ut) + 'authToken';
  }

  private setAuthCookie(
    res: Response,
    accessToken: string,
    userType: UserType,
    expiresIn: number,
  ): void {
    const expirationTime = new Date(Date.now() + expiresIn * 1000);

    this.setCookie(res, this.getAuthCookie(userType), accessToken, {
      expires: expirationTime,
    });
  }

  @ApiBody({ type: () => LoginRequestDto })
  @UseGuards(LocalAuthGuard)
  @HttpCode(200)
  @Post('login')
  async login(
    @Req() req: Request & { user: ValidatedUser },
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, expiresIn, type, role, privilege } =
      await this.authService.login(
        req.user.id,
        req.user.type,
        req.user.role,
        req.user.assignedPrivileges || [],
      );
    this.setAuthCookie(res, accessToken, type, expiresIn);
    return { accessToken, expiresIn, type, role, privilege };
  }

  @UseGuards(GoogleOAuthGuard)
  @Get('google')
  googleOAuth() {}

  @ApiExcludeEndpoint()
  @UseGuards(GoogleOAuthGuard)
  @Get('google/callback')
  @Redirect()
  async googleWebOAuthCallback(
    @Req() req: Request & { user: ValidatedUser },
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, expiresIn, type } = await this.authService.login(
      req.user.id,
      req.user.type,
      req.user.role,
      req.user.assignedPrivileges || [],
    );
    this.setAuthCookie(res, accessToken, type, expiresIn);
    return {
      url: this.appConfig.appWebUrl as string,
    };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ctx = this.getContext(req);
    this.removeCookie(res, this.getAuthCookie(ctx.user.type));
    return { status: 'success' };
  }
}
