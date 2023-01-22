import { TextService } from './text.service';
import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { TextDTO } from './text.types';

@Controller('text')
export class TextController {
  constructor(private textService: TextService) {}

  @Get('all')
  @HttpCode(HttpStatus.OK)
  getAll(): Promise<TextDTO[]> {
    return this.textService.getAll();
  }
}
