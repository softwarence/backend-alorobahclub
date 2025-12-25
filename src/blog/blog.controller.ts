import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  Query,
  UseGuards,
} from "@nestjs/common";
import { BlogService } from "./blog.service";
import { CreateBlogDto } from "./dto/create-blog.dto";
import { UpdateBlogDto } from "./dto/update-blog.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { Roles } from "../auth/role/roles.decorator";
import { Role } from "../auth/role/roles.enum";

@Controller("blog")
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateBlogDto) {
    return this.blogService.create(dto);
  }

  @Get()
  findAll(
    @Query()
    query: {
      status?: "published" | "draft";
      page?: number;
      limit?: number;
    }
  ) {
    return this.blogService.findAll(query);
  }

  @Delete("bulk")
  @UseGuards(JwtAuthGuard)
  @Roles(Role.ADMIN)
  deleteBulkPosts(@Body("ids") ids) {
    return this.blogService.deleteBulk(ids);
  }

  @Get(":slug")
  findOne(@Param("slug") slug: string) {
    return this.blogService.findBySlug(slug);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard)
  @Roles(Role.ADMIN)
  update(@Param("id") id: string, @Body() dto: UpdateBlogDto) {
    return this.blogService.update(id, dto);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  @Roles(Role.ADMIN)
  remove(@Param("id") id: string) {
    return this.blogService.remove(id);
  }
}
