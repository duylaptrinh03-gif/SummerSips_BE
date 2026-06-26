import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
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

  /** ISO date string — để trống = không giới hạn thời gian */
  @IsOptional()
  @IsDateString()
  expiredAt?: string;

  /** Số lần tối đa dùng được — để trống = không giới hạn */
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxUsage?: number;

  /** Giá trị đơn hàng tối thiểu — mặc định 0 */
  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrderValue?: number;
}
