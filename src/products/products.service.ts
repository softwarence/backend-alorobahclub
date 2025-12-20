import { BadRequestException, Injectable } from "@nestjs/common";
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
    const categoryObjectIds = dto.categoryIds.map(
      (id) => new Types.ObjectId(id)
    );

    const count = await this.categoriesService.countByIds(dto.categoryIds);
    if (count !== dto.categoryIds.length) {
      throw new BadRequestException("Invalid category IDs");
    }

    return this.productModel.create({
      ...dto,
      categoryIds: categoryObjectIds,
    });
  }

  async findAll(status?: string) {
    return this.productModel
      .find(status ? { status } : {})
      .populate("categoryIds")
      .lean();
  }
}
