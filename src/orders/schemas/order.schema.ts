import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

// ─── Enum: TrangThaiDonHang (khớp FE) ────────────────────────────────────────
export enum TrangThaiDonHang {
  CHO_XAC_NHAN = 'cho_xac_nhan',
  DANG_PHA_CHE = 'dang_pha_che',
  DANG_GIAO = 'dang_giao',
  HOAN_THANH = 'hoan_thanh',
  DA_HUY = 'da_huy',
}

// Label hiển thị cho từng trạng thái (khớp FE TRANG_THAI_LABEL)
export const TRANG_THAI_LABEL: Record<TrangThaiDonHang, string> = {
  [TrangThaiDonHang.CHO_XAC_NHAN]: 'Chờ xác nhận',
  [TrangThaiDonHang.DANG_PHA_CHE]: 'Đang pha chế',
  [TrangThaiDonHang.DANG_GIAO]: 'Đang giao hàng',
  [TrangThaiDonHang.HOAN_THANH]: 'Hoàn thành',
  [TrangThaiDonHang.DA_HUY]: 'Đã hủy',
};

// ─── Embedded: ToppingOption (snapshot trong CartItem) ───────────────────────
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

// ─── Embedded: OrderItem (khớp FE CartItem) ──────────────────────────────────
@Schema({ _id: false })
export class OrderItem {
  @Prop({ required: true })
  cartId: string; // UUID riêng cho mỗi lần thêm

  @Prop({ required: true })
  drinkId: number; // FE dùng id: number

  @Prop({ required: true })
  name: string;

  @Prop({ default: '' })
  image: string;

  @Prop({ required: true, min: 0 })
  basePrice: number; // Giá gốc (size S)

  @Prop({ required: true, enum: ['S', 'M', 'L'] })
  size: 'S' | 'M' | 'L';

  @Prop({ required: true, min: 0 })
  sizeExtraPrice: number; // Giá cộng thêm của size đã chọn

  @Prop({ type: [OrderItemToppingSchema], default: [] })
  toppings: OrderItemTopping[]; // Danh sách topping đã chọn

  @Prop({ required: true, enum: [0, 50, 100], default: 100 })
  iceLevel: 0 | 50 | 100; // Mức đá: 0%, 50%, 100%

  @Prop({ required: true, enum: [0, 50, 100], default: 100 })
  sugarLevel: 0 | 50 | 100; // Mức đường: 0%, 50%, 100%

  @Prop({ default: '' })
  note: string; // Ghi chú riêng

  @Prop({ required: true, min: 1 })
  quantity: number;
}

export const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

// ─── Embedded: ThongTinNhan (khớp FE) ────────────────────────────────────────
@Schema({ _id: false })
export class ThongTinNhan {
  @Prop({ required: true, trim: true })
  hoTen: string;

  @Prop({ required: true, trim: true })
  soDienThoai: string;

  @Prop({ required: true, trim: true })
  diaChi: string; // Địa chỉ giao hàng
}

export const ThongTinNhanSchema =
  SchemaFactory.createForClass(ThongTinNhan);

// ─── Main: Order (khớp FE Order interface) ───────────────────────────────────
export type OrderDocument = HydratedDocument<Order>;

@Schema({ timestamps: true })
export class Order {
  @Prop({ required: true, unique: true })
  orderId: string; // e.g. "ORD-1713161234567" — FE gọi là `id`

  @Prop({ type: [OrderItemSchema], required: true })
  items: OrderItem[];

  @Prop({ type: ThongTinNhanSchema, required: true })
  thongTinNhan: ThongTinNhan;

  @Prop({ required: true, min: 0 })
  tongTien: number;

  @Prop({
    required: true,
    enum: TrangThaiDonHang,
    default: TrangThaiDonHang.CHO_XAC_NHAN,
  })
  trangThai: TrangThaiDonHang;

  @Prop({ required: true })
  taoLuc: string; // ISO string — FE dùng `taoLuc`
}

export const OrderSchema = SchemaFactory.createForClass(Order);

// Indexes để tra cứu đơn hàng nhanh
OrderSchema.index({ trangThai: 1 });
OrderSchema.index({ orderId: 1 });
OrderSchema.index({ taoLuc: -1 });
