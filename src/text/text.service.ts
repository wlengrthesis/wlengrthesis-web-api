import { Injectable } from '@nestjs/common';
import { Prisma, Text } from '@prisma/client';
import { PrismaClientService } from 'src/prisma-client/prisma-client.service';

@Injectable()
export class TextService {
  constructor(private prisma: PrismaClientService) {}

  async getAll(params?: {
    skip?: number;
    take?: number;
    cursor?: Prisma.TextWhereUniqueInput;
    where?: Prisma.TextWhereInput;
    orderBy?: Prisma.TextOrderByWithRelationInput;
  }): Promise<Text[]> {
    const { skip, take, cursor, where, orderBy } = params;
    return this.prisma.text.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
    });
  }
}
