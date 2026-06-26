import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../user/schemas/user.schema';

interface AuthenticatedRequest {
  user: { id: string; email: string; role: string };
}

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  /**
   * POST /api/v1/reviews
   * Gửi đánh giá hàng loạt cho các sản phẩm trong 1 đơn hàng đã hoàn thành
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Request() req: AuthenticatedRequest, @Body() dto: CreateReviewDto) {
    return this.reviewsService.create(dto, req.user.id);
  }

  /**
   * GET /api/v1/reviews/drink/:drinkId
   * Lấy tất cả đánh giá của 1 sản phẩm (public, tối đa 50 reviews mới nhất)
   */
  @Get('drink/:drinkId')
  findByDrink(@Param('drinkId') drinkId: string) {
    return this.reviewsService.findByDrink(drinkId);
  }

  /**
   * GET /api/v1/reviews/my?page=1&limit=10
   * Lấy đánh giá của user hiện tại
   */
  @Get('my')
  @UseGuards(JwtAuthGuard)
  findMine(
    @Request() req: AuthenticatedRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reviewsService.findMine(
      req.user.id,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 10,
    );
  }

  /**
   * GET /api/v1/reviews?page=1&limit=20
   * Lấy tất cả đánh giá (Admin)
   */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reviewsService.findAll(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  /**
   * DELETE /api/v1/reviews/:id
   * Xóa đánh giá — chủ sở hữu hoặc admin
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.reviewsService.remove(id, req.user.id, req.user.role);
  }
}
