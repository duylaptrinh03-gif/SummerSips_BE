import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { Category } from '../../categories/schemas/category.schema';

// ─── Embedded: ProductSize ───────────────────────────────────────────────────
@Schema({ _id: false })
export class ProductSize {
  @Prop({ required: true, enum: ['S', 'M', 'L'] })
  size_name: 'S' | 'M' | 'L';

  @Prop({ required: true, min: 0, default: 0 })
  extra_price: number;
}

export const ProductSizeSchema = SchemaFactory.createForClass(ProductSize);

// ─── Embedded: ProductTopping ────────────────────────────────────────────────
@Schema({ _id: false })
export class ProductTopping {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, min: 0 })
  price: number;
}

export const ProductToppingSchema =
  SchemaFactory.createForClass(ProductTopping);

// ─── Main: Product ────────────────────────────────────────────────────────────
export type ProductDocument = HydratedDocument<Product>;

@Schema({ timestamps: true })
export class Product {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, min: 0 })
  basePrice: number;

  @Prop({ default: '' })
  image: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ default: true })
  isAvailable: boolean;

  @Prop({ default: '' })
  tag: string;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true,
  })
  category_id: Category;

  @Prop({ type: [ProductSizeSchema], default: [] })
  sizes: ProductSize[];

  @Prop({ type: [ProductToppingSchema], default: [] })
  toppings: ProductTopping[];
}

export const ProductSchema = SchemaFactory.createForClass(Product);

// Index để tăng hiệu năng query theo category và tag
ProductSchema.index({ category_id: 1 });
ProductSchema.index({ tag: 1 });
ProductSchema.index({ isAvailable: 1 });
