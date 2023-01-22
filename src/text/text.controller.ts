import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { TextService } from './text.service';
import { TextDto } from './text.types';

@Controller('text')
export class TextController {
  constructor(private textService: TextService) {}

  @Get('all')
  @HttpCode(HttpStatus.OK)
  getAll(): Promise<TextDto[]> {
    return this.textService.getAll();
  }
}
