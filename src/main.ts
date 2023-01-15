import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { securityHeaders } from './common/middleware/security-headers.middleware'
import { PrismaClientModule } from './prisma-client/prisma-client.module'
import { PrismaClientService } from './prisma-client/prisma-client.service'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  app.useGlobalPipes(new ValidationPipe())
  app.enableCors({ origin: process.env.CORS_ORIGIN })
  app.use(securityHeaders)

  const prismaService = app.select(PrismaClientModule).get(PrismaClientService, { strict: true })
  await prismaService.enableShutdownHooks(app)

  await app.listen(4000)
}

bootstrap()
