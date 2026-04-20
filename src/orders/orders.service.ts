import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import { Order, OrderDocument, TrangThaiDonHang } from './schemas/order.schema';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
  ) {}

  // ─── Helpers ───────────────────────────────────────────────────────────────

  /**
   * Tính tổng giá từ items (logic khớp FE calculateItemPrice)
   * (basePrice + sizeExtraPrice + toppingTotal) * quantity
   */
  private calculateTongTien(
    items: CreateOrderDto['items'],
  ): number {
    return items.reduce((total, item) => {
      const toppingTotal = (item.toppings ?? []).reduce(
        (sum, t) => sum + t.price,
        0,
      );
      const itemPrice =
        (item.basePrice + item.sizeExtraPrice + toppingTotal) * item.quantity;
      return total + itemPrice;
    }, 0);
  }

  // ─── Create Order ──────────────────────────────────────────────────────────

  async create(createOrderDto: CreateOrderDto): Promise<OrderDocument> {
    const { thongTinNhan, items } = createOrderDto;

    // Tính tổng tiền (server-side verify, khớp FE calculateItemPrice)
    const tongTien = this.calculateTongTien(items);

    // Generate orderId theo format FE: "ORD-{timestamp}"
    const orderId = `ORD-${Date.now()}`;

    const order = new this.orderModel({
      orderId,
      items: items.map((item) => ({
        cartId: item.cartId,
        drinkId: item.drinkId,
        name: item.name,
        image: item.image ?? '',
        basePrice: item.basePrice,
        size: item.size,
        sizeExtraPrice: item.sizeExtraPrice,
        toppings: item.toppings ?? [],
        iceLevel: item.iceLevel,
        sugarLevel: item.sugarLevel,
        note: item.note ?? '',
        quantity: item.quantity,
      })),
      thongTinNhan: {
        hoTen: thongTinNhan.hoTen,
        soDienThoai: thongTinNhan.soDienThoai,
        diaChi: thongTinNhan.diaChi,
      },
      tongTien,
      trangThai: TrangThaiDonHang.CHO_XAC_NHAN,
      taoLuc: new Date().toISOString(),
    });

    return order.save();
  }

  // ─── Find All ──────────────────────────────────────────────────────────────

  async findAll(): Promise<OrderDocument[]> {
    return this.orderModel
      .find()
      .sort({ taoLuc: -1 })
      .lean()
      .exec();
  }

  // ─── Find One ──────────────────────────────────────────────────────────────

  async findOne(id: string): Promise<OrderDocument> {
    // Hỗ trợ tìm theo cả MongoDB _id và orderId (ORD-xxx)
    let order: OrderDocument | null;

    if (id.startsWith('ORD-')) {
      order = await this.orderModel.findOne({ orderId: id }).exec();
    } else {
      if (!isValidObjectId(id)) {
        throw new BadRequestException('id không hợp lệ');
      }
      order = await this.orderModel.findById(id).exec();
    }

    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng với id: ${id}`);
    }

    return order;
  }

  // ─── Update Status ─────────────────────────────────────────────────────────

  async updateStatus(
    id: string,
    updateStatusDto: UpdateOrderStatusDto,
  ): Promise<OrderDocument> {
    let order: OrderDocument | null;

    if (id.startsWith('ORD-')) {
      order = await this.orderModel
        .findOneAndUpdate(
          { orderId: id },
          { $set: { trangThai: updateStatusDto.trangThai } },
          { new: true },
        )
        .exec();
    } else {
      if (!isValidObjectId(id)) {
        throw new BadRequestException('id không hợp lệ');
      }
      order = await this.orderModel
        .findByIdAndUpdate(
          id,
          { $set: { trangThai: updateStatusDto.trangThai } },
          { new: true },
        )
        .exec();
    }

    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng với id: ${id}`);
    }

    return order;
  }
}
