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
}

export const CouponSchema = SchemaFactory.createForClass(Coupon);
