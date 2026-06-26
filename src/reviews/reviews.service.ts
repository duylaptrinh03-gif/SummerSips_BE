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
import { User, UserDocument } from '../user/schemas/user.schema';
import { CreateReviewDto } from './dto/create-review.dto';
import { UserRole } from '../user/schemas/user.schema';

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

  // ─── Create ────────────────────────────────────────────────────────────────

  async create(dto: CreateReviewDto, userId: string): Promise<ReviewDocument> {
    const { productId, orderId, rating, comment = '' } = dto;

    if (!isValidObjectId(productId)) {
      throw new BadRequestException('productId không hợp lệ');
    }

    // Xác minh product tồn tại
    const product = await this.productModel.findById(productId).lean().exec();
    if (!product) {
      throw new NotFoundException('Sản phẩm không tồn tại');
    }

    // Xác minh order tồn tại và thuộc về user
    const order = await this.orderModel
      .findOne({ orderId, userId })
      .lean()
      .exec();
    if (!order) {
      throw new NotFoundException('Đơn hàng không tồn tại hoặc không thuộc về bạn');
    }

    // Chỉ đánh giá đơn hàng đã hoàn thành
    if (order.status !== OrderStatus.COMPLETED) {
      throw new BadRequestException('Chỉ có thể đánh giá đơn hàng đã hoàn thành');
    }

    // Kiểm tra product có trong order không
    const itemInOrder = order.items.some((item) => item.drinkId === productId);
    if (!itemInOrder) {
      throw new BadRequestException('Sản phẩm này không có trong đơn hàng');
    }

    // Lấy thông tin user để snapshot
    const user = await this.userModel.findById(userId).lean().exec();
    if (!user) {
      throw new NotFoundException('Người dùng không tồn tại');
    }

    // Tạo review (unique index sẽ chặn nếu đã review rồi)
    let review: ReviewDocument;
    try {
      review = await this.reviewModel.create({
        userId,
        userName: user.name,
        userAvatar: user.avatar ?? '🧑',
        productId,
        productName: product.name,
        orderId,
        rating,
        comment,
      });
    } catch (err: any) {
      if (err.code === 11000) {
        throw new ConflictException('Bạn đã đánh giá sản phẩm này trong đơn hàng này rồi');
      }
      throw err;
    }

    await this.recalculateProductRating(productId);

    return review;
  }

  // ─── Find by Product (public, paginated) ───────────────────────────────────

  async findByProduct(
    productId: string,
    page = 1,
    limit = 10,
  ): Promise<{
    data: ReviewDocument[];
    total: number;
    page: number;
    totalPages: number;
    limit: number;
    avgRating: number | null;
  }> {
    if (!isValidObjectId(productId)) {
      throw new BadRequestException('productId không hợp lệ');
    }

    const skip = (page - 1) * limit;
    const filter = { productId };

    const [data, total] = await Promise.all([
      this.reviewModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.reviewModel.countDocuments(filter).exec(),
    ]);

    const avgRating = total > 0
      ? Math.round((data.reduce((sum, r) => sum + r.rating, 0) / data.length) * 10) / 10
      : null;

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      limit,
      avgRating,
    };
  }

  // ─── Find All (admin) ─────────────────────────────────────────────────────

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
      this.reviewModel
        .find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.reviewModel.countDocuments().exec(),
    ]);
    return { data, total, page, totalPages: Math.ceil(total / limit), limit };
  }

  // ─── Find my reviews (authenticated user) ─────────────────────────────────

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
    const filter = { userId };

    const [data, total] = await Promise.all([
      this.reviewModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.reviewModel.countDocuments(filter).exec(),
    ]);

    return { data, total, page, totalPages: Math.ceil(total / limit), limit };
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

    const { productId } = review;
    await this.reviewModel.findByIdAndDelete(id).exec();
    await this.recalculateProductRating(productId);
  }

  // ─── Recalculate Product Rating ────────────────────────────────────────────

  private async recalculateProductRating(productId: string): Promise<void> {
    const agg = await this.reviewModel
      .aggregate([
        { $match: { productId } },
        { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
      ])
      .exec();

    if (agg.length === 0) {
      await this.productModel
        .findByIdAndUpdate(productId, { $unset: { rating: '' } })
        .exec();
    } else {
      const avg = Math.round(agg[0].avg * 10) / 10;
      await this.productModel
        .findByIdAndUpdate(productId, { $set: { rating: avg } })
        .exec();
    }
  }
}
