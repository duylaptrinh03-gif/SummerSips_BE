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
  category?: string;  // "Cà Phê", "Trà Sữa"… (bỏ qua nếu "Tất cả")
  tag?: string;
  limit?: number;
  search?: string;     // FE SearchFilters.query
  minPrice?: number;   // FE SearchFilters.minPrice
  maxPrice?: number;   // FE SearchFilters.maxPrice
  sort?: string;       // FE SortKey: "default" | "price_asc" | "price_desc" | "name_asc" | "popular"
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

  async findAll(query: FindAllProductsQuery): Promise<ProductDocument[]> {
    const filter: Record<string, unknown> = { isAvailable: true };

    // Filter theo category (string)
    if (query.category && query.category !== 'Tất cả') {
      filter.category = query.category;
    }

    // Filter theo tag
    if (query.tag) {
      filter.tag = query.tag;
    }

    // Search theo tên (regex case-insensitive)
    if (query.search) {
      filter.name = { $regex: query.search, $options: 'i' };
    }

    // Filter theo khoảng giá
    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      filter.basePrice = {};
      if (query.minPrice !== undefined) {
        (filter.basePrice as Record<string, number>).$gte = query.minPrice;
      }
      if (query.maxPrice !== undefined) {
        (filter.basePrice as Record<string, number>).$lte = query.maxPrice;
      }
    }

    // Sort theo FE SortKey
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
        sortOption = { createdAt: -1 }; // default: mới nhất
        break;
    }

    const limit = query.limit && query.limit > 0 ? query.limit : 0;

    return this.productModel
      .find(filter)
      .sort(sortOption)
      .limit(limit)
      .lean()
      .exec();
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
      .findByIdAndUpdate(id, { $set: updateProductDto }, { new: true })
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
