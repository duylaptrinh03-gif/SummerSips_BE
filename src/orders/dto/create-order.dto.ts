import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

// ─── Nested DTO: Topping đã chọn ─────────────────────────────────────────────
export class CreateOrderItemToppingDto {
  @IsString()
  topping_name: string;

  @IsNumber()
  @Min(0)
  price: number;
}

// ─── Nested DTO: Item trong giỏ hàng (Frontend gửi lên) ─────────────────────
export class CreateOrderItemDto {
  @IsMongoId({ message: 'product_id phải là một ObjectId hợp lệ' })
  product_id: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsEnum(['S', 'M', 'L'], { message: 'size phải là S, M hoặc L' })
  size: 'S' | 'M' | 'L';

  @IsOptional()
  @IsNumber()
  @Min(0)
  sugar_level?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  ice_level?: number;

  @IsOptional()
  @IsString()
  note?: string;

  /**
   * Frontend gửi tên các topping đã chọn.
   * Backend sẽ tự tra Product để lấy giá thực tế.
   */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  topping_names?: string[];
}

// ─── Nested DTO: Thông tin nhận hàng ─────────────────────────────────────────
export class ThongTinNhanDto {
  @IsString()
  @MinLength(2)
  customer_name: string;

  @IsString()
  customer_phone: string;

  @IsString()
  customer_address: string;
}

// ─── Main DTO: CreateOrder ────────────────────────────────────────────────────
export class CreateOrderDto {
  @ValidateNested()
  @Type(() => ThongTinNhanDto)
  thongTinNhan: ThongTinNhanDto;

  @IsOptional()
  @IsString()
  couponCode?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];
}
