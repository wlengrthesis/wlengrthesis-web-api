import { Injectable } from '@nestjs/common';
import { PrismaClientService } from '../prisma-client/prisma-client.service';
import { TextDto } from './text.types';

@Injectable()
export class TextService {
  constructor(private prisma: PrismaClientService) {}

  async getAll(): Promise<TextDto[]> {
    const texts = await this.prisma.text.findMany();

    return texts.map(text => ({
      textId: text.id,
      userId: text.userId,
      text: text.text,
      sentiment: text.sentiment,
    }));
  }
}
