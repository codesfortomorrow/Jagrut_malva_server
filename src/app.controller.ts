import {
  Controller,
  ParseFilePipeBuilder,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiParam } from '@nestjs/swagger';
import { StorageService, File, JwtAuthGuard } from '@Common';

@Controller()
export class AppController {
  constructor(private readonly storageService: StorageService) {}

  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'file', type: String, format: 'binary' })
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @Post('upload')
  upload(@UploadedFile(new ParseFilePipeBuilder().build()) file: File) {
    return {
      url: this.storageService.getFileUrl(file.filename),
      meta: {
        originalname: file.originalname,
        filename: file.filename,
        mimetype: file.mimetype,
        size: file.size,
      },
    };
  }
}
