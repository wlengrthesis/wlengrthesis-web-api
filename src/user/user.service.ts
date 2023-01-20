import { ConflictException, Injectable } from '@nestjs/common';
import { User, Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime';
import { PrismaClientService } from '../prisma-client/prisma-client.service';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaClientService) {}

  async getOneById(id: Prisma.UserWhereUniqueInput['id']): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async getOneByEmail(email: Prisma.UserWhereUniqueInput['email']): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async getAll(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.UserWhereUniqueInput;
    where?: Prisma.UserWhereInput;
    orderBy?: Prisma.UserOrderByWithRelationInput;
  }): Promise<User[]> {
    const { skip, take, cursor, where, orderBy } = params;
    return this.prisma.user.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
    });
  }

  async create(
    email: Prisma.UserCreateInput['email'],
    hashedPassword: Prisma.UserCreateInput['hashedPassword']
  ): Promise<User> {
    return this.prisma.user
      .create({
        data: {
          email,
          hashedPassword,
        },
      })
      .catch(error => {
        if (error instanceof PrismaClientKnownRequestError) {
          // Error code P2002: Unique constraint failed - https://www.prisma.io/docs/reference/api-reference/error-reference#p2002
          if (error.code === 'P2002') throw new ConflictException('Bad entry');
        }
        throw error;
      });
  }

  async updateRefreshToken(
    id: Prisma.UserWhereUniqueInput['id'],
    hashedRefreshToken: Prisma.UserUpdateInput['hashedRefreshToken']
  ): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { hashedRefreshToken },
    });
  }

  async clearRefreshToken(id: Prisma.UserWhereUniqueInput['id']): Promise<User> {
    return this.prisma.user.update({
      where: {
        id,
        hashedRefreshToken: {
          not: null,
        },
      },
      data: {
        hashedRefreshToken: null,
      },
    });
  }

  async delete(where: Prisma.UserWhereUniqueInput): Promise<User> {
    return this.prisma.user.delete({ where });
  }
}
