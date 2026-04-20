import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

// ─── Danh mục sản phẩm (string enum khớp FE) ────────────────────────────────
export const CATEGORIES = [
  'Cà Phê',
  'Trà Sữa',
  'Trà Trái Cây',
  'Sinh Tố',
  'Nước Ép',
] as const;

export type Category = (typeof CATEGORIES)[number];

// ─── Embedded: SizeOption ────────────────────────────────────────────────────
@Schema({ _id: false })
export class SizeOption {
  @Prop({ required: true, enum: ['S', 'M', 'L'] })
  name: 'S' | 'M' | 'L';

  @Prop({ required: true, trim: true })
  label: string; // "Nhỏ", "Vừa", "Lớn"

  @Prop({ required: true, min: 0, default: 0 })
  extraPrice: number; // Giá cộng thêm so với giá gốc (VNĐ)
}

export const SizeOptionSchema = SchemaFactory.createForClass(SizeOption);

// ─── Embedded: ToppingOption ─────────────────────────────────────────────────
@Schema({ _id: false })
export class ToppingOption {
  @Prop({ required: true, trim: true })
  id: string;

  @Prop({ required: true, trim: true })
  name: string; // "Trân châu đen", "Thạch đào"…

  @Prop({ required: true, min: 0 })
  price: number; // Giá của topping (VNĐ)
}

export const ToppingOptionSchema =
  SchemaFactory.createForClass(ToppingOption);

// ─── Main: Product (khớp FE Drink interface) ─────────────────────────────────
export type ProductDocument = HydratedDocument<Product>;

@Schema({ timestamps: true })
export class Product {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, min: 0 })
  basePrice: number; // Giá cơ bản (size S)

  @Prop({ default: '' })
  image: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ required: true, enum: CATEGORIES })
  category: Category;

  @Prop({ default: '' })
  tag: string; // "Bán Chạy", "Mới", "Yêu Thích"…

  @Prop({ default: true })
  isAvailable: boolean;

  @Prop({ min: 1, max: 5 })
  rating: number; // 1–5 (tùy chọn)

  @Prop({ default: 0, min: 0 })
  soldCount: number; // Số lượng đã bán (tùy chọn)

  @Prop({ type: [SizeOptionSchema], default: [] })
  sizeOptions: SizeOption[];

  @Prop({ type: [ToppingOptionSchema], default: [] })
  toppingOptions: ToppingOption[];
}

export const ProductSchema = SchemaFactory.createForClass(Product);

// Index để tăng hiệu năng query theo category và tag
ProductSchema.index({ category: 1 });
ProductSchema.index({ tag: 1 });
ProductSchema.index({ isAvailable: 1 });
ProductSchema.index({ name: 'text' }); // Text index cho search
