import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Blog, BlogDocument } from "./schemas/blog.schema";
import { CreateBlogDto } from "./dto/create-blog.dto";
import { UpdateBlogDto } from "./dto/update-blog.dto";

@Injectable()
export class BlogService {
  constructor(
    @InjectModel(Blog.name)
    private readonly blogModel: Model<BlogDocument>
  ) {}

  async create(dto: CreateBlogDto): Promise<Blog> {
    const exists = await this.blogModel.findOne({ slug: dto.slug });
    if (exists) {
      throw new ConflictException("Slug already exists");
    }

    return this.blogModel.create(dto);
  }

  async findAll(
    query: {
      status?: "published" | "draft";
      page?: number;
      limit?: number;
    } = {}
  ) {
    const { status, page = 1, limit = 10 } = query;

    const filter: any = {};
    if (status) {
      filter.status = status;
    }

    const skip = (page - 1) * limit;

    const [blogs, total] = await Promise.all([
      this.blogModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.blogModel.countDocuments(filter),
    ]);

    return {
      code: 200,
      message: "Blogs retrieved successfully",
      results: blogs.length,
      data: blogs,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findBySlug(slug: string): Promise<Blog> {
    const blog = await this.blogModel.findOne({ slug });
    if (!blog) throw new NotFoundException("Blog not found");
    return blog;
  }

  async update(id: string, dto: UpdateBlogDto) {
    const blog = await this.blogModel
      .findByIdAndUpdate(id, { $set: dto }, { new: true, runValidators: true })
      .lean();

    if (!blog) {
      throw new NotFoundException(`Blog with ID ${id} not found`);
    }

    return {
      code: 200,
      message: "Blog updated successfully",
      data: blog,
    };
  }

  async remove(id: string) {
    const result = await this.blogModel.findByIdAndDelete(id);
    if (!result) throw new NotFoundException("Blog not found");
    return {
      code: 200,
      message: "Blog deleted successfully",
      data: result,
    };
  }

  async deleteBulk(ids) {
    if (!ids || ids.length === 0) {
      throw new BadRequestException("No IDs provided for deletion");
    }

    const result = await this.blogModel.deleteMany({
      _id: { $in: ids },
    });

    if (result.deletedCount === 0) {
      throw new NotFoundException("No blogs found to delete");
    }

    return {
      code: 200,
      message: "Bulk deletion successful",
      data: {
        deletedCount: result.deletedCount,
      },
    };
  }
}
