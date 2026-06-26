import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
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
  NewOrderPayload,
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
    const { recipientInfo, items, deliveryFee = 0, couponCode = null, discountAmount = 0 } = createOrderDto;

    // ── Lấy giá thực tế từ DB — không tin giá từ client ──────────────────────
    const productIds = [...new Set(items.map((i) => i.drinkId))];
    const products = await this.productModel
      .find({ _id: { $in: productIds } })
      .lean()
      .exec();

    const productMap = new Map(
      products.map((p) => [p._id.toString(), p]),
    );

    const validatedItems = items.map((item) => {
      const product = productMap.get(item.drinkId);
      if (!product) {
        throw new NotFoundException(
          `Sản phẩm không tồn tại: ${item.drinkId}`,
        );
      }
      if (!product.isAvailable) {
        throw new BadRequestException(
          `Sản phẩm "${product.name}" hiện không có sẵn`,
        );
      }

      const sizeOption = product.sizeOptions?.find(
        (s: { name: string; extraPrice: number }) => s.name === item.size,
      );
      const sizeExtraPrice = sizeOption?.extraPrice ?? 0;

      const validatedToppings = (item.toppings ?? []).map((clientTop) => {
        const dbTop = product.toppingOptions?.find(
          (t: { id: string; price: number; name: string }) =>
            t.id === clientTop.id,
        );
        return dbTop
          ? { id: dbTop.id, name: dbTop.name, price: dbTop.price }
          : { id: clientTop.id, name: clientTop.name, price: 0 };
      });

      return {
        ...item,
        name: product.name,
        image: product.image ?? item.image ?? '',
        basePrice: product.basePrice,
        sizeExtraPrice,
        toppings: validatedToppings,
      };
    });

    const totalPrice = this.calculateTotalPrice(validatedItems);
    const orderId = `ORD-${Date.now()}`;

    const order = new this.orderModel({
      orderId,
      userId: userId ?? null,
      items: validatedItems.map((item) => ({
        cartId: item.cartId,
        drinkId: item.drinkId,
        name: item.name,
        image: item.image,
        basePrice: item.basePrice,
        size: item.size,
        sizeExtraPrice: item.sizeExtraPrice,
        toppings: item.toppings,
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
      deliveryFee,
      couponCode: couponCode || null,
      discountAmount,
      status: OrderStatus.PENDING,
      orderedAt: new Date().toISOString(),
    });

    const savedOrder = await order.save();

    // Notify admin realtime
    const newOrderPayload: NewOrderPayload = {
      orderId: savedOrder.orderId,
      customerName: recipientInfo.fullName,
      totalPrice,
      itemCount: validatedItems.reduce((sum, i) => sum + i.quantity, 0),
      createdAt: new Date().toISOString(),
    };
    this.ordersGateway.emitNewOrder(newOrderPayload);

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

  async findAll(page = 1, limit = 20): Promise<{
    data: OrderDocument[];
    total: number;
    page: number;
    totalPages: number;
    limit: number;
  }> {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.orderModel.find().sort({ orderedAt: -1 }).skip(skip).limit(limit).lean().exec(),
      this.orderModel.countDocuments().exec(),
    ]);
    return { data, total, page, totalPages: Math.ceil(total / limit), limit };
  }

  // ─── Find My Orders (authenticated user) ──────────────────────────────────

  async findMyOrders(userId: string, page = 1, limit = 10): Promise<{
    data: OrderDocument[];
    total: number;
    page: number;
    totalPages: number;
    limit: number;
  }> {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.orderModel.find({ userId }).sort({ orderedAt: -1 }).skip(skip).limit(limit).lean().exec(),
      this.orderModel.countDocuments({ userId }).exec(),
    ]);
    return { data, total, page, totalPages: Math.ceil(total / limit), limit };
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

  // ─── Cancel Order (by owner) ───────────────────────────────────────────────

  async cancel(id: string, userId: string): Promise<OrderDocument> {
    const order = await this.findOne(id);

    if (!order.userId || order.userId.toString() !== userId) {
      throw new ForbiddenException('Bạn không có quyền hủy đơn hàng này');
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(
        'Chỉ có thể hủy đơn hàng đang ở trạng thái chờ xác nhận',
      );
    }

    const cancelledOrder = await this.orderModel
      .findByIdAndUpdate(
        order._id,
        { $set: { status: OrderStatus.CANCELLED } },
        { returnDocument: 'after' },
      )
      .exec();

    if (!cancelledOrder) {
      throw new NotFoundException(`Order not found: ${id}`);
    }

    // Emit realtime event để admin và user biết
    if (cancelledOrder.userId) {
      const payload: OrderStatusUpdatedPayload = {
        orderId: cancelledOrder.orderId,
        userId: cancelledOrder.userId,
        oldStatus: OrderStatus.PENDING,
        newStatus: OrderStatus.CANCELLED,
        message: ORDER_STATUS_LABEL[OrderStatus.CANCELLED],
        updatedAt: new Date().toISOString(),
      };
      this.ordersGateway.emitOrderStatusUpdated(cancelledOrder.userId, payload);
    }

    return cancelledOrder;
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
