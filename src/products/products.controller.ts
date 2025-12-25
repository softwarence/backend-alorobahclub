import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Res,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from "@nestjs/common";
import { ProductsService } from "./products.service";
import { CreateProductDto } from "./dto/create-product.dto";
import { RolesGuard } from "../auth/role/roles.guard";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { Roles } from "../auth/role/roles.decorator";
import { Role } from "../auth/role/roles.enum";
import type { Response } from "express";
import { FilesInterceptor } from "@nestjs/platform-express";
import { UploadService } from "../upload/upload.service";
import { Types } from "mongoose";

@Controller()
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly uploadService: UploadService
  ) {}

  @Get("products")
  redirectToDefault(@Res() res: Response) {
    return res.redirect("/en/products");
  }

  @Get(":lang/products")
  async findAll(@Param("lang") lang, @Query() query) {
    const serviceQuery = {
      ...query,
      lang: lang || "en",
    };

    return this.productsService.findAll(serviceQuery);
  }

  @Get(":lang/products/:slug")
  async findOne(@Param("lang") lang: "en" | "ar", @Param("slug") slug: string) {
    return this.productsService.findOne(slug, lang);
  }

  @Post("admin/products")
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor("images", 10))
  async createProduct(
    @UploadedFiles() files: Express.Multer.File[],
    @Body("data") data: string
  ) {
    if (!data) throw new BadRequestException("Product data is required");
    const dto: CreateProductDto = JSON.parse(data);

    // Validate images
    files.forEach((file) => {
      if (!file.mimetype.startsWith("image/"))
        throw new BadRequestException("Only images allowed");
      if (file.size > 5 * 1024 * 1024)
        throw new BadRequestException("Image too large");
    });

    // Upload images
    const imageUrls = await Promise.all(
      files.map((file) => this.uploadService.uploadImage(file, "products"))
    );

    dto.images = imageUrls;

    return this.productsService.create(dto);
  }

  @Delete("admin/products")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  removeMany(@Body("ids") ids: string[]) {
    return this.productsService.deleteBulk(ids);
  }

  @Patch("admin/products:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  update(@Param("id") id: string, @Body() dto: Partial<CreateProductDto>) {
    return this.productsService.update(id, dto);
  }

  @Delete("admin/products:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  remove(@Param("id") id: string) {
    return this.productsService.deleteOne(id);
  }
}
