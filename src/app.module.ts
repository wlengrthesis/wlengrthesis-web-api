import { Module } from '@nestjs/common'
import { PrismaClientModule } from './prisma-client/prisma-client.module'
import { UserModule } from './user/user.module'
import { AuthModule } from './auth/auth.module'
import { ConfigModule } from '@nestjs/config'
import { APP_GUARD } from '@nestjs/core'
import { AccessTokenGuard } from './common/guards'

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaClientModule, UserModule, AuthModule],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AccessTokenGuard,
    },
  ],
})
export class AppModule {}
