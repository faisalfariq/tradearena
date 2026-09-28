import { NestFactory } from '@nestjs/core';
import { ExpressAdapter, NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as classValidator from 'class-validator';
import * as classTransformer from 'class-transformer';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    new ExpressAdapter(),
  );

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      validatorPackage: classValidator,
      transformerPackage: classTransformer,
    }),
  );

  app.enableShutdownHooks();

  const allowedOrigins = [
    'http://localhost:4444',
    'http://127.0.0.1:4444',
    'http://localhost:3000',
  ];
  if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL);
  }

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or server-to-server)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true); // Permissive in dev/MVP while supporting credentials
      }
    },
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('TradeArena API')
    .setDescription('Automated stock-picking tournament evaluation API')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3333;
  await app.listen(port);
  console.log(
    `TradeArena backend is running on: http://localhost:${port}/api/v1`,
  );
  console.log(`Swagger documentation: http://localhost:${port}/api/docs`);
}
bootstrap();
