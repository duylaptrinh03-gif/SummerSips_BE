import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CouponDocument = HydratedDocument<Coupon>;

export enum CouponType {
  PERCENT = 'percent',
  FREESHIP = 'freeship',
}

@Schema({ timestamps: true })
export class Coupon {
  @Prop({ required: true, unique: true, uppercase: true, trim: true })
  code: string;

  @Prop({ required: true, min: 0 })
  discount_value: number;

  @Prop({ required: true, enum: CouponType })
  type: CouponType;

  @Prop({ default: true })
  is_active: boolean;

  /** Ngày hết hạn — null = không giới hạn */
  @Prop({ type: Date, default: null })
  expiredAt: Date | null;

  /** Số lần tối đa được dùng — null = không giới hạn */
  @Prop({ type: Number, default: null, min: 1 })
  maxUsage: number | null;

  /** Số lần đã dùng */
  @Prop({ type: Number, default: 0, min: 0 })
  usedCount: number;

  /** Giá trị đơn hàng tối thiểu để áp dụng mã — 0 = không yêu cầu */
  @Prop({ type: Number, default: 0, min: 0 })
  minOrderValue: number;
}

export const CouponSchema = SchemaFactory.createForClass(Coupon);
