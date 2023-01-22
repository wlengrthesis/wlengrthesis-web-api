import { Module } from '@nestjs/common';
import { PrismaClientModule } from 'src/prisma-client/prisma-client.module';
import { TextController } from './text.controller';
import { TextService } from './text.service';

@Module({
  imports: [PrismaClientModule],
  controllers: [TextController],
  providers: [TextService],
})
export class TextModule {}
