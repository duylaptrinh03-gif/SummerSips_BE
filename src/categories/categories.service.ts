import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Category, CategoryDocument } from './schemas/category.schema';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,
  ) {}

  findAll(): Promise<CategoryDocument[]> {
    return this.categoryModel.find().sort({ name: 1 }).lean().exec();
  }

  create(dto: CreateCategoryDto): Promise<CategoryDocument> {
    return this.categoryModel.create(dto);
  }

  async update(id: string, dto: CreateCategoryDto): Promise<CategoryDocument> {
    const category = await this.categoryModel
      .findByIdAndUpdate(id, { $set: dto }, { returnDocument: 'after' })
      .exec();
    if (!category) throw new NotFoundException(`Category not found: ${id}`);
    return category;
  }

  async remove(id: string): Promise<void> {
    const result = await this.categoryModel.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException(`Category not found: ${id}`);
  }
}
