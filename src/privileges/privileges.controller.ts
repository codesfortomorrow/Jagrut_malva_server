import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AccessGuard, BaseController, JwtAuthGuard } from '@Common';
import { PrivilegesService } from './privileges.service';
import { GetPrivilegesRequestDto } from './dto';

@ApiTags('Privileges')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AccessGuard)
@Controller('privileges')
export class PrivilegesController extends BaseController {
  constructor(private readonly privilegesService: PrivilegesService) {
    super();
  }

  // FIND ALL
  @Get()
  @ApiOperation({ summary: 'List privileges with search and pagination' })
  @ApiResponse({ status: 200, description: 'List of privileges' })
  findAll(@Query() query: GetPrivilegesRequestDto) {
    return this.privilegesService.findAll(query);
  }

  // FIND ONE
  @Get(':id')
  @ApiOperation({ summary: 'Get privilege by ID' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Privilege details' })
  @ApiResponse({ status: 404, description: 'Privilege not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.privilegesService.findOne(id);
  }
}
