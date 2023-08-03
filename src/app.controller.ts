import {
  Controller,
  ParseFilePipeBuilder,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService, File } from '@Common';

@Controller()
export class AppController {
  constructor(private readonly storageService: StorageService) {}

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
