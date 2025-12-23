import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
import { CreateProductDto } from "./dto/create-product.dto";
import { Model, Types } from "mongoose";
import { Product } from "./schemas/product.schema";
import { CategoriesService } from "../categories/categories.service";
import { InjectModel } from "@nestjs/mongoose";

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<Product>,
    private readonly categoriesService: CategoriesService
  ) {}

  async create(dto: CreateProductDto) {
    let categoryIdsToUse = dto.categoryIds || [];

    if (categoryIdsToUse.length === 0) {
      const defaultCategory =
        await this.categoriesService.findBySlug("uncategorized");
      if (!defaultCategory) {
        throw new InternalServerErrorException(
          "Default 'uncategorized' category not found. Please seed the database."
        );
      }
      categoryIdsToUse = [(defaultCategory as any)._id.toString()];
    }

    const count = await this.categoriesService.countByIds(categoryIdsToUse);

    if (count !== categoryIdsToUse.length) {
      throw new BadRequestException(
        `Validation Failed: Requested ${categoryIdsToUse.length} categories, but only found ${count} in the database.`
      );
    }

    const categoryObjectIds = categoryIdsToUse.map(
      (id) => new Types.ObjectId(id)
    );

    const createdProduct = new this.productModel({
      ...dto,
      categoryIds: categoryObjectIds,
    });

    return createdProduct.save();
  }

  async update(id: string, dto: Partial<CreateProductDto>) {
    const updatedProduct = await this.productModel
      .findByIdAndUpdate(id, { $set: dto }, { new: true, runValidators: true })
      .populate("categoryIds")
      .lean();

    if (!updatedProduct) {
      throw new BadRequestException(`Product with ID ${id} not found.`);
    }

    return updatedProduct;
  }

  async findAll(status?: string) {
    return this.productModel
      .find(status ? { status } : {})
      .populate("categoryIds")
      .lean();
  }

  async deleteOne(id: string) {
    const deletedProduct = await this.productModel.findByIdAndDelete(id);

    if (!deletedProduct) {
      throw new BadRequestException(`Product with ID ${id} not found.`);
    }

    return {
      message: "Product deleted successfully",
      id: deletedProduct._id,
    };
  }

  async deleteBulk(ids: string[]) {
    if (!ids || ids.length === 0) {
      throw new BadRequestException("No product IDs provided for deletion.");
    }

    const objectIds = ids.map((id) => new Types.ObjectId(id));

    const result = await this.productModel.deleteMany({
      _id: { $in: objectIds },
    });

    return {
      message: `${result.deletedCount} products deleted successfully.`,
      deletedCount: result.deletedCount,
    };
  }
}
