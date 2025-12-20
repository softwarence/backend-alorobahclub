import { Injectable, NotFoundException } from "@nestjs/common";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { InjectModel } from "@nestjs/mongoose";
import { Category } from "./schemas/category.schema";
import { Model } from "mongoose";

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name)
    private readonly categoryModel: Model<Category>
  ) {}

  async create(dto: CreateCategoryDto) {
    let level = 0;

    if (dto.parentId) {
      const parent = await this.categoryModel.findById(dto.parentId);
      if (!parent) throw new NotFoundException("Parent category not found");
      level = parent.level + 1;
    }

    return this.categoryModel.create({
      ...dto,
      level,
    });
  }

  async findAll() {
    return this.categoryModel.find({ isActive: true }).lean();
  }

  async findTree() {
    return this.categoryModel.aggregate([
      { $match: { isActive: true } },
      { $sort: { level: 1 } },
    ]);
  }

  async countByIds(ids: string[]): Promise<number> {
    return this.categoryModel.countDocuments({
      _id: { $in: ids },
      isActive: true,
    });
  }
}
