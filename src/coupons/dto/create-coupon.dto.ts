import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { CouponType } from '../schemas/coupon.schema';

export class CreateCouponDto {
  @IsString()
  @MinLength(3)
  code: string;

  @IsNumber()
  @Min(0)
  discount_value: number;

  @IsEnum(CouponType)
  type: CouponType;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
