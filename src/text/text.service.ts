import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaClientService } from '../prisma-client/prisma-client.service';
import { TextDto } from './text.types';

@Injectable()
export class TextService {
  constructor(private prisma: PrismaClientService) {}

  async getMany(params?: {
    skip?: number;
    take?: number;
    cursor?: Prisma.TextWhereUniqueInput;
    where?: Prisma.TextWhereInput;
    orderBy?: Prisma.TextOrderByWithRelationInput;
  }): Promise<TextDto[]> {
    const { skip, take, cursor, where, orderBy } = params;
    const texts = await this.prisma.text.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
    });

    return texts.map(({ id, userId, text, sentiment, probability }) => ({
      textId: id,
      userId,
      text,
      sentiment,
      probability,
    }));
  }
}
