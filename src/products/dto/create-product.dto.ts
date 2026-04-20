import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { CATEGORIES } from '../schemas/product.schema';

// ─── Nested DTO: SizeOption ───────────────────────────────────────────────────
export class CreateSizeOptionDto {
  @IsEnum(['S', 'M', 'L'], { message: 'name phải là S, M hoặc L' })
  name: 'S' | 'M' | 'L';

  @IsString()
  label: string; // "Nhỏ", "Vừa", "Lớn"

  @IsNumber({}, { message: 'extraPrice phải là số' })
  @Min(0)
  extraPrice: number;
}

// ─── Nested DTO: ToppingOption ────────────────────────────────────────────────
export class CreateToppingOptionDto {
  @IsString()
  id: string;

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

  @IsEnum(CATEGORIES, {
    message: `category phải là một trong: ${CATEGORIES.join(', ')}`,
  })
  category: string;

  @IsOptional()
  @IsString()
  tag?: string;

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  soldCount?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSizeOptionDto)
  sizeOptions?: CreateSizeOptionDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateToppingOptionDto)
  toppingOptions?: CreateToppingOptionDto[];
}
