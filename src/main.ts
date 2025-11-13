import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import helmet from 'helmet';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import {
  ValidationError,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import ValidationExceptions from './exceptions/validations.exceptions.js';
import { ConfigService } from '@nestjs/config';
import { NotFoundExceptionFilter } from './exceptions/notfound.exceptions.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const allowedOrigins = [
    'http://localhost:3002',
    'https://useglouse.com',
    'https://admin.useglouse.com',
  ];

  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders:
      'Content-Type,Authorization,x-auth-token,X-Auth-Token,ngrok-skip-browser-warning',
    credentials: true,
  });
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3000;

  app.useGlobalPipes(
    new ValidationPipe({
      exceptionFactory: (errors: ValidationError[]) =>
        new ValidationExceptions(errors),
    }),
  );

  app.useGlobalFilters(new NotFoundExceptionFilter());

  app.enableVersioning({
    type: VersioningType.URI,
  });

  app.use(
    helmet.contentSecurityPolicy({
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: ["'self'", 'https://accounts.google.com'],
      },
    }),
  );

  app.getHttpAdapter().get('/', (req, res) => {
    res.send('welcome to glouse');
  });

  app.getHttpAdapter().get('/health', (req, res) => {
    res.send('healthy');
  });

  app.setGlobalPrefix('/api/v1');

  const options = new DocumentBuilder()
    .setTitle('Synch backend')
    .setDescription('API  documentation for Synch backend')
    .setVersion('1.0.0')
    .addApiKey(
      { type: 'apiKey', name: 'x-auth-token', in: 'header' },
      'x-auth-token', // This is the name of the security scheme
    )
    .build();
  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('/api/v1/docs', app, document);

  await app.listen(port);
}
bootstrap();
