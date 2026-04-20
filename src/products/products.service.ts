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

export interface FindAllProductsQuery {
  category?: string;
  tag?: string;
  limit?: number;
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

    if (query.category) {
      if (!isValidObjectId(query.category)) {
        throw new BadRequestException('category phải là một ObjectId hợp lệ');
      }
      filter.category_id = query.category;
    }

    if (query.tag) {
      filter.tag = query.tag;
    }

    const limit = query.limit && query.limit > 0 ? query.limit : 0;

    return this.productModel
      .find(filter)
      .populate('category_id', 'name')
      .limit(limit)
      .lean()
      .exec();
  }

  async findOne(id: string): Promise<ProductDocument> {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('id không hợp lệ');
    }

    const product = await this.productModel
      .findById(id)
      .populate('category_id', 'name')
      .exec();

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
      .populate('category_id', 'name')
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
