import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { OtpTransport, User, UserMeta, UserType } from '@prisma/client';
import { StorageService, UtilsService, ValidatedUser } from '@Common';
import { userConfigFactory } from '@Config';
import { PrismaService } from '../prisma';
import { OtpService, SendCodeResponse, VerifyCodeResponse } from '../otp';

@Injectable()
export class UsersService {
  constructor(
    @Inject(userConfigFactory.KEY)
    private readonly config: ConfigType<typeof userConfigFactory>,
    private readonly prisma: PrismaService,
    private readonly utilsService: UtilsService,
    private readonly storageService: StorageService,
    private readonly otpService: OtpService,
  ) {}

  private async isEmailExist(
    email: string,
    excludeUserId?: string,
  ): Promise<boolean> {
    return (
      (await this.prisma.user.count({
        where: {
          email: email.toLowerCase(),
          NOT: {
            id: excludeUserId,
          },
        },
      })) !== 0
    );
  }

  private async isUsernameExist(
    username: string,
    excludeUserId?: string,
  ): Promise<boolean> {
    return (
      (await this.prisma.user.count({
        where: {
          username,
          NOT: {
            id: excludeUserId,
          },
        },
      })) !== 0
    );
  }

  private async isMobileExist(
    mobile: string,
    excludeUserId?: string,
  ): Promise<boolean> {
    return (
      (await this.prisma.user.count({
        where: {
          mobile,
          NOT: {
            id: excludeUserId,
          },
        },
      })) !== 0
    );
  }

  private hashPassword(password: string): { salt: string; hash: string } {
    const salt = this.utilsService.generateSalt(this.config.passwordSaltLength);
    const hash = this.utilsService.hashPassword(
      password,
      salt,
      this.config.passwordHashLength,
    );
    return { salt, hash };
  }

  private isValidUsername(username: string): boolean {
    return /^[a-z][a-z0-9_]{3,20}$/.test(username);
  }

  async getById(id: string): Promise<User | null> {
    return await this.prisma.user.findUnique({
      where: {
        id,
      },
    });
  }

  async getByEmail(email: string): Promise<User | null> {
    return await this.prisma.user.findUnique({
      where: {
        email: email.toLowerCase(),
      },
    });
  }

  async getByUsername(username: string): Promise<User | null> {
    return await this.prisma.user.findUnique({
      where: {
        username,
      },
    });
  }

  async getByMobile(mobile: string): Promise<User | null> {
    return await this.prisma.user.findUnique({
      where: {
        mobile,
      },
    });
  }

  async getMetaById(userId: string): Promise<UserMeta | null> {
    return await this.prisma.userMeta.findUnique({
      where: {
        userId,
      },
    });
  }

  async validateCredentials(
    email: string,
    password: string,
  ): Promise<ValidatedUser | false | null> {
    const user = await this.getByEmail(email);
    if (!user) return null;

    const userMeta = await this.getMetaById(user.id);
    if (!userMeta) return null;

    const passwordHash = this.utilsService.hashPassword(
      password,
      userMeta.passwordSalt || '',
      userMeta.passwordHash
        ? userMeta.passwordHash.length / 2
        : this.config.passwordHashLength,
    );

    if (userMeta.passwordHash === passwordHash) {
      return {
        id: user.id,
        type: user.type,
      };
    }

    return false;
  }

  async create(
    firstname: string,
    lastname: string,
    email: string,
    password: string,
    mobile?: string,
  ): Promise<User> {
    if (await this.isEmailExist(email)) throw new Error('Email already exist');

    if (mobile && (await this.isMobileExist(mobile)))
      throw new Error('Mobile already exist');

    const { salt, hash } = this.hashPassword(password);
    const passwordSalt = salt;
    const passwordHash = hash;

    return await this.prisma.user.create({
      data: {
        firstname,
        lastname,
        email: email.toLowerCase(),
        type: UserType.User,
        mobile,
        meta: {
          create: {
            passwordHash,
            passwordSalt,
          },
        },
      },
    });
  }

  getProfileImage(user: User): string | null {
    if (user.profileImage) {
      return this.storageService.getFileUrl(
        user.profileImage,
        this.config.profileImagePath,
      );
    }
    return null;
  }

  async getProfile(userId: string): Promise<User> {
    const user = await this.getById(userId);
    if (!user) throw new Error('User not found');
    user.profileImage = this.getProfileImage(user);
    return user;
  }

  async updateProfileDetails(
    userId: string,
    username?: string,
    firstname?: string,
    lastname?: string,
    email?: string,
    mobile?: string,
  ): Promise<User> {
    if (email && (await this.isEmailExist(email, userId)))
      throw new Error('Email already exist');

    if (username && !this.isValidUsername(username))
      throw new Error('Invalid username');

    if (username && (await this.isUsernameExist(username, userId)))
      throw new Error('Username already exist');

    if (mobile && (await this.isMobileExist(mobile, userId)))
      throw new Error('Mobile already exist');

    return await this.prisma.user.update({
      data: {
        username: username && username.toLowerCase(),
        firstname,
        lastname,
        email: email && email.toLowerCase(),
        mobile,
      },
      where: {
        id: userId,
      },
    });
  }

  async updateProfileImage(
    userId: string,
    profileImage: string,
  ): Promise<{ profileImage: string | null }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) throw new Error('User not found');

    // Remove current profile image from storage
    if (user.profileImage) {
      const profilePath = `${this.config.profileImagePath}/${user.profileImage}`;
      if (await this.storageService.exist(profilePath)) {
        await this.storageService.removeFile(profilePath);
      }
    }

    await this.storageService.move(profileImage, this.config.profileImagePath);
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { profileImage },
    });

    return {
      profileImage: this.getProfileImage(updatedUser),
    };
  }

  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<User> {
    const user = await this.getById(userId);
    if (!user) throw new Error('User not found');

    const userMeta = await this.getMetaById(user.id);
    if (!userMeta) throw new Error('User meta not found');

    const hashedPassword = this.utilsService.hashPassword(
      oldPassword,
      userMeta.passwordSalt || '',
      userMeta.passwordHash
        ? userMeta.passwordHash.length / 2
        : this.config.passwordHashLength,
    );

    if (hashedPassword !== userMeta.passwordHash)
      throw new Error('Password does not match');

    const { salt, hash } = this.hashPassword(newPassword);
    const passwordSalt = salt;
    const passwordHash = hash;

    await this.prisma.userMeta.update({
      data: {
        passwordHash,
        passwordSalt,
      },
      where: {
        userId,
      },
    });
    return user;
  }

  async sendPasswordResetCode(
    email?: string,
    mobile?: string,
  ): Promise<SendCodeResponse> {
    let user: User | null | undefined;

    if (email) user = await this.getByEmail(email);
    if (!user && mobile) user = await this.getByMobile(mobile);
    if (!user) throw new Error('User does not exist');

    let response: SendCodeResponse | undefined | null;

    if (mobile) {
      response = await this.otpService.send(
        mobile,
        OtpTransport.Mobile,
        undefined,
        user.firstname,
      );
    }
    if (email) {
      response = await this.otpService.send(
        email,
        OtpTransport.Email,
        undefined,
        user.firstname,
      );
    }
    if (!response) throw new Error('Unexpected error');
    return response;
  }

  async resetPassword(
    code: string,
    newPassword: string,
    mobile?: string,
    email?: string,
  ): Promise<User> {
    // Get user
    let user: User | null | undefined;

    if (email) {
      user = await this.getByEmail(email);
    }
    if (!user && mobile) {
      user = await this.getByMobile(mobile);
    }
    if (!user) throw new Error('User not found');

    // Validate code
    let response: VerifyCodeResponse | null | undefined;

    if (mobile)
      response = await this.otpService.verify(
        code,
        mobile,
        OtpTransport.Mobile,
      );
    if (email)
      response = await this.otpService.verify(code, email, OtpTransport.Email);
    if (!response) throw new Error('Invalid email or mobile');
    if (response.status === false)
      throw new Error('Incorrect verification code');

    // Reset password
    const { salt: passwordSalt, hash: passwordHash } =
      this.hashPassword(newPassword);

    await this.prisma.userMeta.update({
      data: {
        passwordSalt,
        passwordHash,
      },
      where: { userId: user.id },
    });
    return user;
  }
}
