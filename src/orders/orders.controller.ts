import { Controller, Get, Post, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
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
   * GET /api/v1/orders/my
   * Lịch sử đơn hàng của user hiện tại
   */
  @Get('my')
  @UseGuards(JwtAuthGuard)
  getMyOrders(@Request() req: AuthenticatedRequest) {
    return this.ordersService.findMyOrders(req.user!.id);
  }

  /**
   * GET /api/v1/orders
   * Lấy danh sách tất cả đơn hàng (Admin)
   */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  findAll() {
    return this.ordersService.findAll();
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
