import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import { Review, ReviewDocument } from './schemas/review.schema';
import { Order, OrderDocument, OrderStatus } from '../orders/schemas/order.schema';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import { User, UserDocument, UserRole } from '../user/schemas/user.schema';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectModel(Review.name)
    private readonly reviewModel: Model<ReviewDocument>,
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  // ─── Create (batch) ────────────────────────────────────────────────────────

  async create(dto: CreateReviewDto, userId: string): Promise<ReviewDocument[]> {
    const { orderId, items } = dto;

    if (!isValidObjectId(orderId)) {
      throw new BadRequestException('orderId không hợp lệ');
    }

    // Xác minh order tồn tại, thuộc về user và đã hoàn thành
    const order = await this.orderModel.findById(orderId).lean().exec() as OrderDocument | null;
    if (!order) {
      throw new NotFoundException('Đơn hàng không tồn tại');
    }
    if (!order.userId || order.userId !== userId) {
      throw new ForbiddenException('Đơn hàng không thuộc về bạn');
    }
    if (order.status !== OrderStatus.COMPLETED) {
      throw new BadRequestException('Chỉ có thể đánh giá đơn hàng đã hoàn thành');
    }

    // Lấy thông tin user để snapshot
    const user = await this.userModel.findById(userId).lean().exec();
    if (!user) {
      throw new NotFoundException('Người dùng không tồn tại');
    }

    const created: ReviewDocument[] = [];
    const affectedDrinkIds = new Set<string>();

    for (const item of items) {
      const { drinkId, rating, comment = '' } = item;

      if (!isValidObjectId(drinkId)) {
        throw new BadRequestException(`drinkId không hợp lệ: ${drinkId}`);
      }

      // Kiểm tra drink có trong order không
      const itemInOrder = order.items.some((i) => i.drinkId === drinkId);
      if (!itemInOrder) {
        throw new BadRequestException(`Sản phẩm ${drinkId} không có trong đơn hàng`);
      }

      // Lấy tên sản phẩm
      const product = await this.productModel.findById(drinkId).lean().exec();
      if (!product) {
        throw new NotFoundException(`Sản phẩm không tồn tại: ${drinkId}`);
      }

      try {
        const review = await this.reviewModel.create({
          userId,
          userName: user.name,
          userAvatar: user.avatar ?? '🧑',
          drinkId,
          drinkName: product.name,
          orderId,
          rating,
          comment,
        });
        created.push(review);
        affectedDrinkIds.add(drinkId);
      } catch (err: any) {
        if (err.code === 11000) {
          // Đã đánh giá sản phẩm này trong đơn hàng này — bỏ qua thay vì báo lỗi
          continue;
        }
        throw err;
      }
    }

    // Cập nhật rating trung bình cho tất cả drink bị ảnh hưởng
    await Promise.all(
      [...affectedDrinkIds].map((id) => this.recalculateProductRating(id)),
    );

    return created;
  }

  // ─── Find by Drink (public, flat list) ────────────────────────────────────

  async findByDrink(drinkId: string): Promise<ReviewDocument[]> {
    if (!isValidObjectId(drinkId)) {
      throw new BadRequestException('drinkId không hợp lệ');
    }

    return this.reviewModel
      .find({ drinkId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean()
      .exec() as unknown as ReviewDocument[];
  }

  // ─── Find All (admin, paginated) ──────────────────────────────────────────

  async findAll(
    page = 1,
    limit = 20,
  ): Promise<{
    data: ReviewDocument[];
    total: number;
    page: number;
    totalPages: number;
    limit: number;
  }> {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.reviewModel.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean().exec(),
      this.reviewModel.countDocuments().exec(),
    ]);
    return {
      data: data as unknown as ReviewDocument[],
      total,
      page,
      totalPages: Math.ceil(total / limit),
      limit,
    };
  }

  // ─── Find Mine (authenticated user, paginated) ────────────────────────────

  async findMine(
    userId: string,
    page = 1,
    limit = 10,
  ): Promise<{
    data: ReviewDocument[];
    total: number;
    page: number;
    totalPages: number;
    limit: number;
  }> {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.reviewModel.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean().exec(),
      this.reviewModel.countDocuments({ userId }).exec(),
    ]);
    return {
      data: data as unknown as ReviewDocument[],
      total,
      page,
      totalPages: Math.ceil(total / limit),
      limit,
    };
  }

  // ─── Delete ────────────────────────────────────────────────────────────────

  async remove(id: string, userId: string, userRole: string): Promise<void> {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('id không hợp lệ');
    }

    const review = await this.reviewModel.findById(id).exec();
    if (!review) {
      throw new NotFoundException('Đánh giá không tồn tại');
    }

    if (userRole !== UserRole.ADMIN && review.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền xóa đánh giá này');
    }

    const { drinkId } = review;
    await this.reviewModel.findByIdAndDelete(id).exec();
    await this.recalculateProductRating(drinkId);
  }

  // ─── Recalculate Product Rating ────────────────────────────────────────────

  private async recalculateProductRating(drinkId: string): Promise<void> {
    const agg = await this.reviewModel
      .aggregate([
        { $match: { drinkId } },
        { $group: { _id: null, avg: { $avg: '$rating' } } },
      ])
      .exec();

    if (agg.length === 0) {
      await this.productModel
        .findByIdAndUpdate(drinkId, { $unset: { rating: '' } })
        .exec();
    } else {
      const avg = Math.round(agg[0].avg * 10) / 10;
      await this.productModel
        .findByIdAndUpdate(drinkId, { $set: { rating: avg } })
        .exec();
    }
  }
}
