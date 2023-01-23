import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { AccessTokenGuard } from './auth/guards';
import { PrismaClientModule } from './prisma-client/prisma-client.module';
import { UserModule } from './user/user.module';
import { SentimentAnalysisModule } from './sentiment-analysis/sentiment-analysis.module';
import { TextModule } from './text/text.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaClientModule,
    UserModule,
    AuthModule,
    SentimentAnalysisModule,
    TextModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AccessTokenGuard,
    },
  ],
})
export class AppModule {}
