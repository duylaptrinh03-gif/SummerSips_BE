import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { CouponsModule } from './coupons/coupons.module';

@Module({
  imports: [
    // Kết nối MongoDB — đặt MONGO_URI trong file .env
    MongooseModule.forRoot(
      process.env.MONGO_URI ||
        'mongodb+srv://duylaptrinh03_db_user:[EMAIL_ADDRESS]/nest_demo?retryWrites=true&w=majority',
    ),
    ProductsModule,
    OrdersModule,
    CouponsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
