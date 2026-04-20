import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import { Order, OrderDocument, OrderStatus } from './schemas/order.schema';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import { Coupon, CouponDocument, CouponType } from '../coupons/schemas/coupon.schema';
import { CreateOrderDto, CreateOrderItemDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

const DEFAULT_DELIVERY_FEE = 15000;

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,

    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,

    @InjectModel(Coupon.name)
    private readonly couponModel: Model<CouponDocument>,
  ) {}

  // ─── Helpers ───────────────────────────────────────────────────────────────

  /**
   * Tính giá cho một item dựa trên dữ liệu thực từ Product document.
   * Frontend KHÔNG gửi giá - backend tự map để đảm bảo tính toàn vẹn dữ liệu.
   */
  private buildOrderItem(
    itemDto: CreateOrderItemDto,
    product: ProductDocument,
  ) {
    // Tìm extra_price theo size
    const sizeObj = product.sizes.find((s) => s.size_name === itemDto.size);
    if (!sizeObj) {
      throw new UnprocessableEntityException(
        `Sản phẩm "${product.name}" không có size ${itemDto.size}`,
      );
    }

    // Snapshot toppings được chọn — lấy giá từ product
    const toppingSnapshots: Array<{ topping_name: string; price: number }> = [];
    for (const name of itemDto.topping_names ?? []) {
      const toppingObj = product.toppings.find((t) => t.name === name);
      if (!toppingObj) {
        throw new UnprocessableEntityException(
          `Topping "${name}" không tồn tại trong sản phẩm "${product.name}"`,
        );
      }
      toppingSnapshots.push({ topping_name: toppingObj.name, price: toppingObj.price });
    }

    const toppingTotal = toppingSnapshots.reduce((sum, t) => sum + t.price, 0);
    const unitPrice = product.basePrice + sizeObj.extra_price + toppingTotal;
    const item_price = unitPrice * itemDto.quantity;

    return {
      product_id: product._id,
      quantity: itemDto.quantity,
      size: itemDto.size,
      sugar_level: itemDto.sugar_level ?? 100,
      ice_level: itemDto.ice_level ?? 100,
      note: itemDto.note ?? '',
      toppings: toppingSnapshots,
      item_price,
    };
  }

  // ─── Create Order ──────────────────────────────────────────────────────────

  async create(createOrderDto: CreateOrderDto): Promise<OrderDocument> {
    const { thongTinNhan, couponCode, items: itemDtos } = createOrderDto;

    // 1. Load tất cả Products cần thiết trong 1 query
    const productIds = itemDtos.map((i) => i.product_id);
    for (const id of productIds) {
      if (!isValidObjectId(id)) {
        throw new BadRequestException(`product_id "${id}" không hợp lệ`);
      }
    }

    const products = await this.productModel
      .find({ _id: { $in: productIds } })
      .exec();

    const productMap = new Map(
      products.map((p) => [p._id.toString(), p]),
    );

    // 2. Validate & build order items
    const builtItems = itemDtos.map((itemDto) => {
      const product = productMap.get(itemDto.product_id);
      if (!product) {
        throw new NotFoundException(
          `Sản phẩm với id "${itemDto.product_id}" không tồn tại`,
        );
      }
      if (!product.isAvailable) {
        throw new UnprocessableEntityException(
          `Sản phẩm "${product.name}" hiện không có sẵn`,
        );
      }
      return this.buildOrderItem(itemDto, product);
    });

    // 3. Tính tổng tiền hàng
    const rawTotal = builtItems.reduce((sum, i) => sum + i.item_price, 0);
    let delivery_fee = DEFAULT_DELIVERY_FEE;
    let discount = 0;

    // 4. Áp dụng coupon nếu có
    if (couponCode) {
      const coupon = await this.couponModel.findOne({
        code: couponCode.toUpperCase().trim(),
        is_active: true,
      });

      if (!coupon) {
        throw new BadRequestException(`Mã giảm giá "${couponCode}" không hợp lệ hoặc đã hết hạn`);
      }

      if (coupon.type === CouponType.FREESHIP) {
        discount = delivery_fee;
        delivery_fee = 0;
      } else if (coupon.type === CouponType.PERCENT) {
        discount = Math.round((rawTotal * coupon.discount_value) / 100);
      }
    }

    const total_price = rawTotal + delivery_fee - discount;

    // 5. Tạo và lưu đơn hàng
    const order = new this.orderModel({
      customer_name: thongTinNhan.customer_name,
      customer_phone: thongTinNhan.customer_phone,
      customer_address: thongTinNhan.customer_address,
      status: OrderStatus.CHO_XAC_NHAN,
      items: builtItems,
      total_price,
      delivery_fee,
      discount,
    });

    return order.save();
  }

  // ─── Find All ──────────────────────────────────────────────────────────────

  async findAll(): Promise<OrderDocument[]> {
    return this.orderModel
      .find()
      .populate('items.product_id', 'name image')
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  // ─── Find One ──────────────────────────────────────────────────────────────

  async findOne(id: string): Promise<OrderDocument> {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('id không hợp lệ');
    }

    const order = await this.orderModel
      .findById(id)
      .populate('items.product_id', 'name image')
      .exec();

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
    if (!isValidObjectId(id)) {
      throw new BadRequestException('id không hợp lệ');
    }

    const order = await this.orderModel
      .findByIdAndUpdate(
        id,
        { $set: { status: updateStatusDto.status } },
        { new: true },
      )
      .exec();

    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng với id: ${id}`);
    }

    return order;
  }
}
