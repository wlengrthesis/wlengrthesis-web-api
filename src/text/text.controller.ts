import { Controller, Get, HttpCode, HttpStatus, Param, UseGuards } from '@nestjs/common';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TextService } from './text.service';
import { TextDto } from './text.types';
@UseGuards(RolesGuard)
@Controller('text')
export class TextController {
  constructor(private textService: TextService) {}

  @Roles('SUPERADMIN', 'ADMIN')
  @HttpCode(HttpStatus.OK)
  @Get('all')
  getAll(): Promise<TextDto[]> {
    return this.textService.getMany();
  }

  @Roles('SUPERADMIN', 'ADMIN', 'USER')
  @HttpCode(HttpStatus.OK)
  @Get(':id/all')
  getAllByUserId(@Param('id') userId: number): Promise<TextDto[]> {
    return this.textService.getMany({ where: { userId } });
  }
}
