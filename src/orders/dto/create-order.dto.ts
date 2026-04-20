import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

// ─── Nested DTO: Topping đã chọn (khớp FE ToppingOption) ────────────────────
export class OrderItemToppingDto {
  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsNumber()
  @Min(0)
  price: number;
}

// ─── Nested DTO: CartItem (FE gửi full thông tin) ────────────────────────────
export class CreateOrderItemDto {
  @IsString()
  cartId: string; // UUID riêng

  @IsNumber()
  drinkId: number;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsNumber()
  @Min(0)
  basePrice: number;

  @IsEnum(['S', 'M', 'L'], { message: 'size phải là S, M hoặc L' })
  size: 'S' | 'M' | 'L';

  @IsNumber()
  @Min(0)
  sizeExtraPrice: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemToppingDto)
  toppings?: OrderItemToppingDto[];

  @IsEnum([0, 50, 100], { message: 'iceLevel phải là 0, 50 hoặc 100' })
  iceLevel: 0 | 50 | 100;

  @IsEnum([0, 50, 100], { message: 'sugarLevel phải là 0, 50 hoặc 100' })
  sugarLevel: 0 | 50 | 100;

  @IsOptional()
  @IsString()
  note?: string;

  @IsInt()
  @Min(1)
  quantity: number;
}

// ─── Nested DTO: ThongTinNhan (khớp FE) ──────────────────────────────────────
export class ThongTinNhanDto {
  @IsString()
  @MinLength(2)
  hoTen: string;

  @IsString()
  soDienThoai: string;

  @IsString()
  diaChi: string;
}

// ─── Main DTO: CreateOrder ────────────────────────────────────────────────────
export class CreateOrderDto {
  @ValidateNested()
  @Type(() => ThongTinNhanDto)
  thongTinNhan: ThongTinNhanDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];
}
