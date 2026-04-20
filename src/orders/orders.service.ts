import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import { Order, OrderDocument, OrderStatus } from './schemas/order.schema';
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
   * Calculate total price from items — mirrors FE calculateItemPrice logic:
   * (basePrice + sizeExtraPrice + toppingTotal) * quantity
   */
  private calculateTotalPrice(items: CreateOrderDto['items']): number {
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
    const { recipientInfo, items } = createOrderDto;

    const totalPrice = this.calculateTotalPrice(items);
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
      recipientInfo: {
        fullName: recipientInfo.fullName,
        phoneNumber: recipientInfo.phoneNumber,
        address: recipientInfo.address,
      },
      totalPrice,
      status: OrderStatus.PENDING,
      orderedAt: new Date().toISOString(),
    });

    return order.save();
  }

  // ─── Find All ──────────────────────────────────────────────────────────────

  async findAll(): Promise<OrderDocument[]> {
    return this.orderModel.find().sort({ orderedAt: -1 }).lean().exec();
  }

  // ─── Find One ──────────────────────────────────────────────────────────────

  async findOne(id: string): Promise<OrderDocument> {
    let order: OrderDocument | null;

    if (id.startsWith('ORD-')) {
      order = await this.orderModel.findOne({ orderId: id }).exec();
    } else {
      if (!isValidObjectId(id)) {
        throw new BadRequestException('Invalid id');
      }
      order = await this.orderModel.findById(id).exec();
    }

    if (!order) {
      throw new NotFoundException(`Order not found: ${id}`);
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
          { $set: { status: updateStatusDto.status } },
          { new: true },
        )
        .exec();
    } else {
      if (!isValidObjectId(id)) {
        throw new BadRequestException('Invalid id');
      }
      order = await this.orderModel
        .findByIdAndUpdate(
          id,
          { $set: { status: updateStatusDto.status } },
          { new: true },
        )
        .exec();
    }

    if (!order) {
      throw new NotFoundException(`Order not found: ${id}`);
    }

    return order;
  }
}
