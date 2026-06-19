import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import helmet from 'helmet';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { SocketIoAdapter } from './ws-adapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS phải enable trước helmet
  const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim());

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Security headers — tắt CORP để không chặn cross-origin fetch từ browser
  app.use(
    helmet({
      crossOriginResourcePolicy: false,
    }),
  );

  // Socket.IO adapter với CORS được cấu hình đúng
  app.useWebSocketAdapter(new SocketIoAdapter(app));

  // Global prefix: tất cả route sẽ bắt đầu bằng /api/v1
  app.setGlobalPrefix('api/v1');

  // Cấu hình Swagger
  const config = new DocumentBuilder()
    .setTitle('Drink Shop API')
    .setDescription('The Drink Shop API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, documentFactory);

  // Global Interceptor: chuẩn hóa dữ liệu trả về { statusCode, data, totalResult }
  app.useGlobalInterceptors(new TransformInterceptor());

  // Global ValidationPipe: tự động validate DTO, transform payload, bỏ qua field không khai báo
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  await app.listen(process.env.PORT || 3001, '0.0.0.0');
  console.log(
    `🚀 Server running on: http://localhost:${process.env.PORT || 3001}/api/v1`,
  );
  console.log(
    `⚡ WebSocket gateway running on port ${process.env.PORT || 3001}`,
  );
}
bootstrap();
