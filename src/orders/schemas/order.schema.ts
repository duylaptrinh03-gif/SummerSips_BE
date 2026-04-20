import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { Product } from '../../products/schemas/product.schema';

// ─── Enum: OrderStatus ────────────────────────────────────────────────────────
export enum OrderStatus {
  CHO_XAC_NHAN = 'CHO_XAC_NHAN',
  DANG_PHA_CHE = 'DANG_PHA_CHE',
  DANG_GIAO = 'DANG_GIAO',
  HOAN_THANH = 'HOAN_THANH',
  DA_HUY = 'DA_HUY',
}

// ─── Embedded: OrderItemTopping (snapshot tại thời điểm mua) ─────────────────
@Schema({ _id: false })
export class OrderItemTopping {
  @Prop({ required: true })
  topping_name: string;

  @Prop({ required: true, min: 0 })
  price: number;
}

export const OrderItemToppingSchema =
  SchemaFactory.createForClass(OrderItemTopping);

// ─── Embedded: OrderItem ──────────────────────────────────────────────────────
@Schema({ _id: false })
export class OrderItem {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  })
  product_id: Product;

  @Prop({ required: true, min: 1 })
  quantity: number;

  /** Kích cỡ khách chọn (S / M / L) */
  @Prop({ required: true, enum: ['S', 'M', 'L'] })
  size: 'S' | 'M' | 'L';

  /** Phần trăm đường: 0 / 25 / 50 / 75 / 100 */
  @Prop({ default: 100 })
  sugar_level: number;

  /** Phần trăm đá: 0 / 25 / 50 / 75 / 100 */
  @Prop({ default: 100 })
  ice_level: number;

  @Prop({ default: '' })
  note: string;

  /** Snapshot giá topping tại thời điểm đặt hàng */
  @Prop({ type: [OrderItemToppingSchema], default: [] })
  toppings: OrderItemTopping[];

  /** Giá của 1 item (base + size extra + toppings) × quantity — được backend tự tính */
  @Prop({ required: true, min: 0 })
  item_price: number;
}

export const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

// ─── Main: Order ──────────────────────────────────────────────────────────────
export type OrderDocument = HydratedDocument<Order>;

@Schema({ timestamps: true })
export class Order {
  /** Nullable: khách không cần đăng nhập */
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null })
  user_id: mongoose.Types.ObjectId | null;

  @Prop({ required: true, trim: true })
  customer_name: string;

  @Prop({ required: true, trim: true })
  customer_phone: string;

  @Prop({ required: true, trim: true })
  customer_address: string;

  @Prop({
    required: true,
    enum: OrderStatus,
    default: OrderStatus.CHO_XAC_NHAN,
  })
  status: OrderStatus;

  @Prop({ type: [OrderItemSchema], required: true })
  items: OrderItem[];

  @Prop({ required: true, min: 0 })
  total_price: number;

  @Prop({ default: 0, min: 0 })
  delivery_fee: number;

  @Prop({ default: 0, min: 0 })
  discount: number;
}

export const OrderSchema = SchemaFactory.createForClass(Order);

// Indexes để tra cứu đơn hàng nhanh
OrderSchema.index({ status: 1 });
OrderSchema.index({ user_id: 1 });
OrderSchema.index({ createdAt: -1 });
