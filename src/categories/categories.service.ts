import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { InjectModel } from "@nestjs/mongoose";
import { Category, CategoryDocument } from "./schemas/category.schema";
import { Model } from "mongoose";

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name)
    private readonly categoryModel: Model<Category>
  ) {}

  async create(dto: CreateCategoryDto) {
    try {
      let level = 0;
      if (dto.parentId) {
        const parent = await this.categoryModel.findById(dto.parentId);
        if (!parent) throw new NotFoundException("Parent category not found");
        level = parent.level + 1;
      }

      return await this.categoryModel.create({ ...dto, level });
    } catch (error) {
      if (error.code === 11000) {
        throw new ConflictException(
          `The slug "${dto.slug}" is already in use.`
        );
      }
      throw new InternalServerErrorException("Database error occurred");
    }
  }

  async update(id: string, dto: Partial<CreateCategoryDto>) {
    try {
      // 1. Prevent renaming or changing the slug of 'uncategorized'
      if (dto.slug || dto.name) {
        const existing = await this.categoryModel.findById(id);
        if (existing?.slug === "uncategorized") {
          throw new BadRequestException(
            "The 'uncategorized' category cannot be renamed."
          );
        }
      }

      // 2. Handle Parent ID change and Level recalculation
      let level: number | undefined = undefined;
      if (dto.parentId) {
        const parent = await this.categoryModel.findById(dto.parentId);
        if (!parent) throw new NotFoundException("Parent category not found");
        level = parent.level + 1;
      }

      const updated = await this.categoryModel
        .findByIdAndUpdate(
          id,
          { ...dto, ...(level !== undefined && { level }) },
          { new: true, runValidators: true }
        )
        .lean();

      if (!updated) throw new NotFoundException("Category not found");
      return updated;
    } catch (error) {
      if (error.code === 11000) {
        throw new ConflictException(`Slug "${dto.slug}" is already in use.`);
      }
      throw error;
    }
  }

  async remove(id: string) {
    const category = await this.categoryModel.findById(id);

    if (!category) {
      throw new NotFoundException("Category not found");
    }

    if (category.slug === "uncategorized") {
      throw new BadRequestException(
        "The default 'uncategorized' category cannot be deleted."
      );
    }

    await this.categoryModel.findByIdAndDelete(id);
    return { message: "Category deleted successfully", id };
  }

  async removeMany(ids: string[]) {
    if (!ids || ids.length === 0) {
      throw new BadRequestException("No IDs provided");
    }

    // Delete categories where ID is in the list AND slug is NOT 'uncategorized'
    const result = await this.categoryModel.deleteMany({
      _id: { $in: ids },
      slug: { $ne: "uncategorized" },
    });

    return {
      message: `${result.deletedCount} categories deleted successfully.`,
      note: "Default 'uncategorized' category (if selected) was skipped.",
    };
  }

  async findAll() {
    return this.categoryModel.find({ isActive: true }).lean();
  }

  async findBySlug(slug: string): Promise<CategoryDocument | null> {
    return this.categoryModel.findOne({ slug }).exec();
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
