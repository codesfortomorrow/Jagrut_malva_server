import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserRequestDto } from './dto';
import { User } from '../generated/prisma/client';
import { AuthenticatedRequest, BaseController, JwtAuthGuard } from '@Common';
@UseGuards(JwtAuthGuard)
@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController extends BaseController {
  constructor(private readonly usersService: UsersService) {
    super();
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a new user against the organization hierarchy',
  })
  @ApiBody({ type: CreateUserRequestDto })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
  })
  async register(
    @Body() dto: CreateUserRequestDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<User> {
    const ctx = this.getContext(req);
    return this.usersService.registerUser(dto, ctx.user.id);
  }
}
