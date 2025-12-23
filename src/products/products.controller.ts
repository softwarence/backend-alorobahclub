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
} from "@nestjs/common";
import { ProductsService } from "./products.service";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { RolesGuard } from "../auth/role/roles.guard";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { Roles } from "../auth/role/roles.decorator";
import { Role } from "../auth/role/roles.enum";

@Controller("products")
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @Roles(Role.ADMIN)
  async create(@Body() dto: CreateProductDto) {
    const data = await this.productsService.create(dto);
    return {
      code: 200,
      message: "Product created successfully",
      data,
    };
  }

  @Get()
  @Roles(Role.ADMIN)
  findAll(@Query("status") status?: string) {
    return this.productsService.findAll(status);
  }

  @Patch(":id")
  @Roles(Role.ADMIN)
  update(@Param("id") id: string, @Body() dto: Partial<CreateProductDto>) {
    return this.productsService.update(id, dto);
  }

  @Delete(":id")
  @Roles(Role.ADMIN)
  remove(@Param("id") id: string) {
    return this.productsService.deleteOne(id);
  }

  @Delete()
  @Roles(Role.ADMIN)
  removeMany(@Body("ids") ids: string[]) {
    return this.productsService.deleteBulk(ids);
  }
}
