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

// ─── Nested DTO: Topping ──────────────────────────────────────────────────────
export class OrderItemToppingDto {
  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsNumber()
  @Min(0)
  price: number;
}

// ─── Nested DTO: OrderItem (full CartItem from FE) ────────────────────────────
export class CreateOrderItemDto {
  @IsString()
  cartId: string;

  @IsNumber()
  drinkId: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsNumber()
  @Min(0)
  basePrice: number;

  @IsEnum(['S', 'M', 'L'], { message: 'size must be S, M or L' })
  size: 'S' | 'M' | 'L';

  @IsNumber()
  @Min(0)
  sizeExtraPrice: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemToppingDto)
  toppings?: OrderItemToppingDto[];

  @IsEnum([0, 50, 100], { message: 'iceLevel must be 0, 50 or 100' })
  iceLevel: 0 | 50 | 100;

  @IsEnum([0, 50, 100], { message: 'sugarLevel must be 0, 50 or 100' })
  sugarLevel: 0 | 50 | 100;

  @IsOptional()
  @IsString()
  note?: string;

  @IsInt()
  @Min(1)
  quantity: number;
}

// ─── Nested DTO: RecipientInfo ────────────────────────────────────────────────
export class RecipientInfoDto {
  @IsString()
  @MinLength(2)
  fullName: string;

  @IsString()
  phoneNumber: string;

  @IsString()
  address: string;
}

// ─── Main DTO: CreateOrder ────────────────────────────────────────────────────
export class CreateOrderDto {
  @ValidateNested()
  @Type(() => RecipientInfoDto)
  recipientInfo: RecipientInfoDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];
}
