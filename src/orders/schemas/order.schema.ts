import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

// ─── Enum: OrderStatus ────────────────────────────────────────────────────────
export enum OrderStatus {
  PENDING = 'pending',
  PREPARING = 'preparing',
  DELIVERING = 'delivering',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]: 'Chờ xác nhận',
  [OrderStatus.PREPARING]: 'Đang pha chế',
  [OrderStatus.DELIVERING]: 'Đang giao hàng',
  [OrderStatus.COMPLETED]: 'Hoàn thành',
  [OrderStatus.CANCELLED]: 'Đã hủy',
};

// ─── Embedded: OrderItemTopping ───────────────────────────────────────────────
@Schema({ _id: false })
export class OrderItemTopping {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, min: 0 })
  price: number;
}

export const OrderItemToppingSchema =
  SchemaFactory.createForClass(OrderItemTopping);

// ─── Embedded: OrderItem (matches FE CartItem) ────────────────────────────────
@Schema({ _id: false })
export class OrderItem {
  @Prop({ required: true })
  cartId: string;

  @Prop({ required: true })
  drinkId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ default: '' })
  image: string;

  @Prop({ required: true, min: 0 })
  basePrice: number;

  @Prop({ required: true, enum: ['S', 'M', 'L'] })
  size: 'S' | 'M' | 'L';

  @Prop({ required: true, min: 0 })
  sizeExtraPrice: number;

  @Prop({ type: [OrderItemToppingSchema], default: [] })
  toppings: OrderItemTopping[];

  @Prop({ required: true, enum: [0, 50, 100], default: 100 })
  iceLevel: 0 | 50 | 100;

  @Prop({ required: true, enum: [0, 50, 100], default: 100 })
  sugarLevel: 0 | 50 | 100;

  @Prop({ default: '' })
  note: string;

  @Prop({ required: true, min: 1 })
  quantity: number;
}

export const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

// ─── Embedded: RecipientInfo ─────────────────────────────────────────────────
@Schema({ _id: false })
export class RecipientInfo {
  @Prop({ required: true, trim: true })
  fullName: string;

  @Prop({ required: true, trim: true })
  phoneNumber: string;

  @Prop({ required: true, trim: true })
  address: string;
}

export const RecipientInfoSchema = SchemaFactory.createForClass(RecipientInfo);

// ─── Main: Order ──────────────────────────────────────────────────────────────
export type OrderDocument = HydratedDocument<Order>;

@Schema({ timestamps: true })
export class Order {
  @Prop({ required: true, unique: true })
  orderId: string; // e.g. "ORD-1713161234567"

  @Prop({ type: [OrderItemSchema], required: true })
  items: OrderItem[];

  @Prop({ type: RecipientInfoSchema, required: true })
  recipientInfo: RecipientInfo;

  @Prop({ required: true, min: 0 })
  totalPrice: number;

  @Prop({
    required: true,
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status: OrderStatus;

  @Prop({ required: true })
  orderedAt: string; // ISO string
}

export const OrderSchema = SchemaFactory.createForClass(Order);

OrderSchema.index({ status: 1 });
OrderSchema.index({ orderId: 1 });
OrderSchema.index({ orderedAt: -1 });
