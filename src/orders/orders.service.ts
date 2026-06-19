import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import {
  Order,
  OrderDocument,
  OrderStatus,
  ORDER_STATUS_LABEL,
} from './schemas/order.schema';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import {
  OrdersGateway,
  OrderStatusUpdatedPayload,
} from './orders.gateway';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    private readonly ordersGateway: OrdersGateway,
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

  async create(
    createOrderDto: CreateOrderDto,
    userId?: string,
  ): Promise<OrderDocument> {
    const { recipientInfo, items } = createOrderDto;

    const totalPrice = this.calculateTotalPrice(items);
    const orderId = `ORD-${Date.now()}`;

    const order = new this.orderModel({
      orderId,
      userId: userId ?? null,
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

    const savedOrder = await order.save();

    // Tăng soldCount cho từng sản phẩm trong đơn hàng
    await Promise.all(
      items.map((item) =>
        this.productModel
          .findByIdAndUpdate(item.drinkId, {
            $inc: { soldCount: item.quantity },
          })
          .exec()
          .catch(() => null),
      ),
    );

    return savedOrder;
  }

  // ─── Find All (admin) ──────────────────────────────────────────────────────

  async findAll(): Promise<OrderDocument[]> {
    return this.orderModel.find().sort({ orderedAt: -1 }).lean().exec();
  }

  // ─── Find My Orders (authenticated user) ──────────────────────────────────

  async findMyOrders(userId: string): Promise<OrderDocument[]> {
    return this.orderModel
      .find({ userId })
      .sort({ orderedAt: -1 })
      .lean()
      .exec();
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
    // Lấy order hiện tại để ghi nhận oldStatus trước khi update
    const currentOrder = await this.findOne(id);
    const oldStatus = currentOrder.status;

    let updatedOrder: OrderDocument | null;

    if (id.startsWith('ORD-')) {
      updatedOrder = await this.orderModel
        .findOneAndUpdate(
          { orderId: id },
          { $set: { status: updateStatusDto.status } },
          { returnDocument: 'after' },
        )
        .exec();
    } else {
      updatedOrder = await this.orderModel
        .findByIdAndUpdate(
          id,
          { $set: { status: updateStatusDto.status } },
          { returnDocument: 'after' },
        )
        .exec();
    }

    if (!updatedOrder) {
      throw new NotFoundException(`Order not found: ${id}`);
    }

    // Emit realtime event nếu order thuộc về user đăng nhập
    if (updatedOrder.userId) {
      const payload: OrderStatusUpdatedPayload = {
        orderId: updatedOrder.orderId,
        userId: updatedOrder.userId,
        oldStatus,
        newStatus: updatedOrder.status,
        message: ORDER_STATUS_LABEL[updatedOrder.status],
        updatedAt: new Date().toISOString(),
      };
      this.ordersGateway.emitOrderStatusUpdated(updatedOrder.userId, payload);
    }

    return updatedOrder;
  }
}
