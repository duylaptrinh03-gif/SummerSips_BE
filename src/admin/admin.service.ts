import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderDocument, OrderStatus } from '../orders/schemas/order.schema';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import { User, UserDocument } from '../user/schemas/user.schema';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async getStats() {
    const [
      totalOrders,
      pendingOrders,
      completedOrders,
      cancelledOrders,
      totalProducts,
      totalUsers,
      revenueAgg,
      recentOrders,
      topProducts,
    ] = await Promise.all([
      this.orderModel.countDocuments(),
      this.orderModel.countDocuments({ status: OrderStatus.PENDING }),
      this.orderModel.countDocuments({ status: OrderStatus.COMPLETED }),
      this.orderModel.countDocuments({ status: OrderStatus.CANCELLED }),
      this.productModel.countDocuments({ isAvailable: true }),
      this.userModel.countDocuments(),
      // Tổng doanh thu từ đơn completed
      this.orderModel.aggregate([
        { $match: { status: OrderStatus.COMPLETED } },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } },
      ]),
      // 10 đơn hàng gần nhất
      this.orderModel
        .find()
        .sort({ orderedAt: -1 })
        .limit(10)
        .select('orderId status totalPrice recipientInfo.fullName orderedAt')
        .lean()
        .exec(),
      // Top 5 sản phẩm bán chạy
      this.productModel
        .find()
        .sort({ soldCount: -1 })
        .limit(5)
        .select('name soldCount basePrice image category')
        .lean()
        .exec(),
    ]);

    return {
      overview: {
        totalOrders,
        pendingOrders,
        completedOrders,
        cancelledOrders,
        totalProducts,
        totalUsers,
        totalRevenue: revenueAgg[0]?.total ?? 0,
      },
      recentOrders,
      topProducts,
    };
  }
}
