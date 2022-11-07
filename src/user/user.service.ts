import { ForbiddenException, Injectable } from '@nestjs/common'
import { User, Prisma } from '@prisma/client'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime'
import { PrismaClientService } from 'src/prisma-client/prisma-client.service'

@Injectable()
export class UserService {
  constructor(private prisma: PrismaClientService) {}

  async getOneById(id: Prisma.UserWhereUniqueInput['id']): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: {
        id,
      },
    })
  }

  async getOneByEmail(email: Prisma.UserWhereUniqueInput['email']): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: {
        email,
      },
    })
  }

  async getAll(params: {
    skip?: number
    take?: number
    cursor?: Prisma.UserWhereUniqueInput
    where?: Prisma.UserWhereInput
    orderBy?: Prisma.UserOrderByWithRelationInput
  }): Promise<User[]> {
    const { skip, take, cursor, where, orderBy } = params
    return this.prisma.user.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
    })
  }

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user
      .create({
        data,
      })
      .catch(error => {
        if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
          throw new ForbiddenException('Credentials incorrect')
        }
        throw error
      })
  }

  async update(params: { where: Prisma.UserWhereUniqueInput; data: Prisma.UserUpdateInput }): Promise<User> {
    const { where, data } = params
    return this.prisma.user.update({
      data,
      where,
    })
  }

  async updateMany(params: {
    where: Prisma.UserWhereInput
    data: Prisma.XOR<Prisma.UserUpdateManyMutationInput, Prisma.UserUncheckedUpdateManyInput>
  }): Promise<void> {
    const { where, data } = params
    this.prisma.user.updateMany({
      where,
      data,
    })
  }

  async delete(where: Prisma.UserWhereUniqueInput): Promise<User> {
    return this.prisma.user.delete({
      where,
    })
  }
}
