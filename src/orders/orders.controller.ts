import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../user/schemas/user.schema';

interface AuthenticatedRequest {
  user?: { id: string; email: string; role: string };
}

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  /**
   * POST /api/v1/orders
   * Đặt hàng — guest hoặc user đăng nhập đều được
   */
  @Post()
  @UseGuards(OptionalJwtAuthGuard)
  create(@Request() req: AuthenticatedRequest, @Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.create(createOrderDto, req.user?.id);
  }

  /**
   * GET /api/v1/orders/my?page=1&limit=10
   * Lịch sử đơn hàng của user hiện tại (có phân trang)
   */
  @Get('my')
  @UseGuards(JwtAuthGuard)
  getMyOrders(
    @Request() req: AuthenticatedRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.ordersService.findMyOrders(
      req.user!.id,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 10,
    );
  }

  /**
   * GET /api/v1/orders?page=1&limit=20
   * Lấy danh sách tất cả đơn hàng (Admin, có phân trang)
   */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.ordersService.findAll(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  /**
   * GET /api/v1/orders/:id
   * Lấy chi tiết 1 đơn hàng (hỗ trợ cả MongoDB _id và orderId "ORD-xxx")
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  /**
   * PATCH /api/v1/orders/:id/cancel
   * Hủy đơn hàng — chỉ owner mới được hủy, chỉ khi trạng thái là pending
   */
  @Patch(':id/cancel')
  @UseGuards(JwtAuthGuard)
  cancelOrder(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.ordersService.cancel(id, req.user!.id);
  }

  /**
   * PATCH /api/v1/orders/:id/status
   * Cập nhật trạng thái đơn hàng (Admin)
   */
  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(id, updateStatusDto);
  }
}
