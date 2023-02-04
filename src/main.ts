import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { securityHeaders } from './common/middleware/security-headers.middleware';
import { PrismaClientModule } from './prisma-client/prisma-client.module';
import { PrismaClientService } from './prisma-client/prisma-client.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe());
  app.enableCors({ origin: process.env.CORS_ORIGIN });
  app.use(securityHeaders);
  app.use(helmet());

  const config = new DocumentBuilder()
    .setTitle('Sentiment Analysis Web API')
    .setDescription('API to predict the analysis of provided text')
    .setVersion('1.0')
    .addBearerAuth(
      {
        description: 'Please enter token in following format: Bearer <JWT>',
        name: 'Authorization',
        bearerFormat: 'Bearer',
        scheme: 'Bearer',
        type: 'http',
        in: 'Header',
      },
      'token'
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const prismaService = app.select(PrismaClientModule).get(PrismaClientService, { strict: true });
  await prismaService.enableShutdownHooks(app);

  await app.listen(4000);
}

bootstrap();
