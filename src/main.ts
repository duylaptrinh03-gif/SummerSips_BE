import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix: tất cả route sẽ bắt đầu bằng /api/v1
  app.setGlobalPrefix('api/v1');

  // Global ValidationPipe: tự động validate DTO, transform payload, bỏ qua field không khai báo
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Bỏ qua các field không có trong DTO
      transform: true, // Tự động transform sang đúng kiểu dữ liệu
      forbidNonWhitelisted: true, // Trả lỗi nếu client gửi field không hợp lệ
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // CORS cho Frontend gọi API
  app.enableCors({
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  await app.listen(process.env.PORT || 3000, '0.0.0.0');
  console.log(
    `🚀 Server running on: http://localhost:${process.env.PORT || 3000}/api/v1`,
  );
}
bootstrap();
