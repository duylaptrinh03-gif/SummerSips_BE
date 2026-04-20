import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Controller('drinks')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  /**
   * POST /api/v1/drinks
   * Tạo sản phẩm mới (Admin)
   */
  @Post()
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  /**
   * GET /api/v1/drinks?category=<id>&tag=<tag>&limit=<n>
   * Lấy danh sách sản phẩm hỗ trợ filter
   */
  @Get()
  findAll(
    @Query('category') category?: string,
    @Query('tag') tag?: string,
    @Query('limit') limit?: string,
  ) {
    return this.productsService.findAll({
      category,
      tag,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  /**
   * GET /api/v1/drinks/:id
   * Lấy chi tiết 1 sản phẩm
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  /**
   * PATCH /api/v1/drinks/:id
   * Cập nhật sản phẩm (Admin)
   */
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productsService.update(id, updateProductDto);
  }

  /**
   * DELETE /api/v1/drinks/:id
   * Xóa sản phẩm (Admin)
   */
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}
