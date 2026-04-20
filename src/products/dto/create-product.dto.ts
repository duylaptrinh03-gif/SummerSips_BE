import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

// ─── Nested DTO: ProductSize ──────────────────────────────────────────────────
export class CreateProductSizeDto {
  @IsEnum(['S', 'M', 'L'], { message: 'size_name phải là S, M hoặc L' })
  size_name: 'S' | 'M' | 'L';

  @IsNumber({}, { message: 'extra_price phải là số' })
  @Min(0)
  extra_price: number;
}

// ─── Nested DTO: ProductTopping ───────────────────────────────────────────────
export class CreateProductToppingDto {
  @IsString()
  name: string;

  @IsNumber({}, { message: 'price phải là số' })
  @Min(0)
  price: number;
}

// ─── Main DTO: CreateProduct ──────────────────────────────────────────────────
export class CreateProductDto {
  @IsString()
  name: string;

  @IsNumber({}, { message: 'basePrice phải là số' })
  @Min(0)
  basePrice: number;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @IsOptional()
  @IsString()
  tag?: string;

  @IsMongoId({ message: 'category_id phải là một ObjectId hợp lệ' })
  category_id: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductSizeDto)
  sizes?: CreateProductSizeDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductToppingDto)
  toppings?: CreateProductToppingDto[];
}
