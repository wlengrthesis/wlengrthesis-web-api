import { Module } from '@nestjs/common';
import { PrismaClientModule } from '../prisma-client/prisma-client.module';
import { UserService } from './user.service';

@Module({
  imports: [PrismaClientModule],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
