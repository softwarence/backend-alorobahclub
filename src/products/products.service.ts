import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
import { CreateProductDto } from "./dto/create-product.dto";
import { Model, Types } from "mongoose";
import { Product } from "./schemas/product.schema";
import { CategoriesService } from "../categories/categories.service";
import { InjectModel } from "@nestjs/mongoose";
import { Cart } from "../carts/schemas/cart.schema";

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<Product>,
    @InjectModel(Cart.name) private cartModel: Model<Cart>,
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

      categoryIdsToUse = [defaultCategory._id.toString()];
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

    try {
      return await createdProduct.save();
    } catch (err: any) {
      if (err.code === 11000 && err.keyPattern?.slug) {
        throw new ConflictException(
          `Product slug '${dto.slug}' already exists.`
        );
      }
      throw err;
    }
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

  async findAll(query: any = {}) {
    const { status, lang = "en", page = 1, limit = 10 } = query;

    const filter: any = status ? { status } : {};

    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      this.productModel
        .find(filter)
        .populate("categoryIds")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.productModel.countDocuments(filter),
    ]);

    const mappedData = products.map((product: any) => ({
      ...product,
      title: product.title?.[lang] ?? product.title?.en,
      description: product.description?.[lang] ?? product.description?.en,
    }));

    return {
      code: 200,
      message: "Products retrieved successfully",
      results: mappedData.length,
      data: mappedData,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(slug: string, lang: "en" | "ar" = "en") {
    const product = await this.productModel
      .findOne({ slug })
      .populate("categoryIds")
      .lean();

    if (!product) return null;

    return {
      ...product,
      title: product.title?.[lang] ?? product.title?.en,
      description: product.description?.[lang] ?? product.description?.en,
    };
  }

  async deleteOne(id: string) {
    const deletedProduct = await this.productModel.findByIdAndDelete(id);

    if (!deletedProduct) {
      throw new BadRequestException(`Product with ID ${id} not found.`);
    }

    await this.cartModel.updateMany(
      { "items.productId": deletedProduct._id },
      { $pull: { items: { productId: deletedProduct._id } } }
    );

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

    await this.cartModel.updateMany(
      { "items.productId": { $in: objectIds } },
      { $pull: { items: { productId: { $in: objectIds } } } }
    );

    return {
      message: `${result.deletedCount} products deleted successfully.`,
      deletedCount: result.deletedCount,
    };
  }
}
