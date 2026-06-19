import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Coupon, CouponDocument, CouponType } from './schemas/coupon.schema';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { ValidateCouponDto } from './dto/validate-coupon.dto';

@Injectable()
export class CouponsService {
  constructor(
    @InjectModel(Coupon.name)
    private readonly couponModel: Model<CouponDocument>,
  ) {}

  findAll(): Promise<CouponDocument[]> {
    return this.couponModel.find().sort({ createdAt: -1 }).lean().exec();
  }

  create(dto: CreateCouponDto): Promise<CouponDocument> {
    return this.couponModel.create({ ...dto, code: dto.code.toUpperCase() });
  }

  async update(id: string, dto: Partial<CreateCouponDto>): Promise<CouponDocument> {
    const coupon = await this.couponModel
      .findByIdAndUpdate(id, { $set: dto }, { returnDocument: 'after' })
      .exec();
    if (!coupon) throw new NotFoundException(`Coupon not found: ${id}`);
    return coupon;
  }

  async remove(id: string): Promise<void> {
    const result = await this.couponModel.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException(`Coupon not found: ${id}`);
  }

  /** Xác thực mã coupon và tính số tiền được giảm */
  async validate(dto: ValidateCouponDto): Promise<{
    valid: boolean;
    discountAmount: number;
    type: CouponType;
    message: string;
  }> {
    const coupon = await this.couponModel
      .findOne({ code: dto.code.toUpperCase(), is_active: true })
      .exec();

    if (!coupon) {
      throw new BadRequestException('Mã giảm giá không hợp lệ hoặc đã hết hạn');
    }

    let discountAmount = 0;

    if (coupon.type === CouponType.PERCENT) {
      discountAmount = Math.round((dto.orderTotal * coupon.discount_value) / 100);
    } else if (coupon.type === CouponType.FREESHIP) {
      // Freeship: discount_value = phí ship được miễn
      discountAmount = coupon.discount_value;
    }

    return {
      valid: true,
      discountAmount,
      type: coupon.type,
      message: coupon.type === CouponType.PERCENT
        ? `Giảm ${coupon.discount_value}% — tiết kiệm ${discountAmount.toLocaleString('vi-VN')}đ`
        : `Miễn phí vận chuyển`,
    };
  }
}
