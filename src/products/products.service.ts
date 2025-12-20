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

  async findAll(status?: string) {
    return this.productModel
      .find(status ? { status } : {})
      .populate("categoryIds")
      .lean();
  }
}
