import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  /**
   * POST /api/v1/orders
   * Khách đặt hàng — backend tự map giá từ Product, áp dụng coupon
   */
  @Post()
  create(@Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.create(createOrderDto);
  }

  /**
   * GET /api/v1/orders
   * Lấy danh sách tất cả đơn hàng (Admin)
   */
  @Get()
  findAll() {
    return this.ordersService.findAll();
  }

  /**
   * GET /api/v1/orders/:id
   * Lấy chi tiết 1 đơn hàng
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  /**
   * PATCH /api/v1/orders/:id/status
   * Cập nhật trạng thái đơn hàng (Admin)
   */
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(id, updateStatusDto);
  }
}
