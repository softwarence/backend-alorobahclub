import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Delete,
  Patch,
  Param,
} from "@nestjs/common";
import { CategoriesService } from "./categories.service";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/role/roles.guard";
import { Roles } from "../auth/role/roles.decorator";
import { Role } from "../auth/role/roles.enum";

@Controller("categories")
@UseGuards(JwtAuthGuard, RolesGuard)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @Get()
  findAll() {
    return this.categoriesService.findAll();
  }

  @Get("tree")
  findTree() {
    return this.categoriesService.findTree();
  }

  @Patch(":id")
  @Roles(Role.ADMIN)
  update(@Param("id") id: string, @Body() dto: Partial<CreateCategoryDto>) {
    return this.categoriesService.update(id, dto);
  }

  @Delete(":id")
  @Roles(Role.ADMIN)
  remove(@Param("id") id: string) {
    return this.categoriesService.remove(id);
  }

  @Delete()
  @Roles(Role.ADMIN)
  removeMany(@Body("ids") ids: string[]) {
    return this.categoriesService.removeMany(ids);
  }
}
