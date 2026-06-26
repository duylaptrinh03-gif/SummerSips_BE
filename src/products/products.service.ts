import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import { Product, ProductDocument } from './schemas/product.schema';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

// ── Query params khớp FE SearchFilters & SortKey ────────────────────────────
export interface FindAllProductsQuery {
  category?: string; // "Cà Phê", "Trà Sữa"… (bỏ qua nếu "Tất cả")
  tag?: string;
  limit?: number;
  page?: number; // nếu truyền vào → trả về PaginatedResult thay vì array
  search?: string; // FE SearchFilters.query
  minPrice?: number; // FE SearchFilters.minPrice
  maxPrice?: number; // FE SearchFilters.maxPrice
  sort?: string; // FE SortKey: "default" | "price_asc" | "price_desc" | "name_asc" | "popular"
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
  ) {}

  async create(createProductDto: CreateProductDto): Promise<ProductDocument> {
    const created = new this.productModel(createProductDto);
    return created.save();
  }

  async findAll(
    query: FindAllProductsQuery,
  ): Promise<ProductDocument[] | PaginatedResult<ProductDocument>> {
    const filter: Record<string, unknown> = { isAvailable: true };

    if (query.category && query.category !== 'Tất cả') {
      filter.category = query.category;
    }

    if (query.tag) {
      filter.tag = query.tag;
    }

    if (query.search) {
      const escaped = query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.name = { $regex: escaped, $options: 'i' };
    }

    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      filter.basePrice = {};
      if (query.minPrice !== undefined) {
        (filter.basePrice as Record<string, number>).$gte = query.minPrice;
      }
      if (query.maxPrice !== undefined) {
        (filter.basePrice as Record<string, number>).$lte = query.maxPrice;
      }
    }

    let sortOption: Record<string, 1 | -1> = {};
    switch (query.sort) {
      case 'price_asc':
        sortOption = { basePrice: 1 };
        break;
      case 'price_desc':
        sortOption = { basePrice: -1 };
        break;
      case 'name_asc':
        sortOption = { name: 1 };
        break;
      case 'popular':
        sortOption = { soldCount: -1 };
        break;
      default:
        sortOption = { createdAt: -1 };
        break;
    }

    // Nếu có page → trả về paginated; không có → behavior cũ (backward compat)
    if (query.page !== undefined && query.page > 0) {
      const pageSize = query.limit && query.limit > 0 ? query.limit : 12;
      const skip = (query.page - 1) * pageSize;

      const [data, total] = await Promise.all([
        this.productModel.find(filter).sort(sortOption).skip(skip).limit(pageSize).lean().exec(),
        this.productModel.countDocuments(filter).exec(),
      ]);

      return {
        data,
        total,
        page: query.page,
        totalPages: Math.ceil(total / pageSize),
        limit: pageSize,
      };
    }

    const limit = query.limit && query.limit > 0 ? query.limit : 0;
    return this.productModel.find(filter).sort(sortOption).limit(limit).lean().exec();
  }

  async findOne(id: string): Promise<ProductDocument> {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('id không hợp lệ');
    }

    const product = await this.productModel.findById(id).exec();

    if (!product) {
      throw new NotFoundException(`Không tìm thấy sản phẩm với id: ${id}`);
    }

    return product;
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
  ): Promise<ProductDocument> {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('id không hợp lệ');
    }

    const updated = await this.productModel
      .findByIdAndUpdate(id, { $set: updateProductDto }, { returnDocument: 'after' })
      .exec();

    if (!updated) {
      throw new NotFoundException(`Không tìm thấy sản phẩm với id: ${id}`);
    }

    return updated;
  }

  async remove(id: string): Promise<{ message: string }> {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('id không hợp lệ');
    }

    const deleted = await this.productModel.findByIdAndDelete(id).exec();

    if (!deleted) {
      throw new NotFoundException(`Không tìm thấy sản phẩm với id: ${id}`);
    }

    return { message: `Đã xóa sản phẩm: ${deleted.name}` };
  }
}
