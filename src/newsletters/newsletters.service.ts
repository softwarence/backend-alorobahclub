import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Newsletter, NewsletterDocument } from "./schemas/newsletter.schema";
import { CreateNewsletterDto } from "./dto/create-newsletter.dto";

@Injectable()
export class NewsletterService {
  constructor(
    @InjectModel(Newsletter.name)
    private readonly newsletterModel: Model<NewsletterDocument>
  ) {}

  async subscribe(dto: CreateNewsletterDto) {
    try {
      return await this.newsletterModel.create({
        email: dto.email,
      });
    } catch (error) {
      if (error.code === 11000) {
        throw new ConflictException("Email already subscribed");
      }
      throw error;
    }
  }

  async unsubscribe(email: string) {
    return this.newsletterModel.findOneAndUpdate(
      { email },
      { isActive: false },
      { new: true }
    );
  }

  async findAll(query: {
    isActive?: string;
    email?: string;
    page?: number;
    limit?: number;
  }) {
    const { isActive, email, page = 1, limit = 10 } = query;

    const filter: any = {};

    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    if (email) {
      filter.email = { $regex: email, $options: "i" };
    }

    const skip = (page - 1) * limit;

    const [subscribers, total] = await Promise.all([
      this.newsletterModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.newsletterModel.countDocuments(filter),
    ]);

    return {
      code: 200,
      message: "Subscribers retrieved successfully",
      results: subscribers.length,
      data: subscribers,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async deleteSubscriber(id) {
    const result = await this.newsletterModel.findByIdAndDelete(id).lean();

    if (!result) {
      throw new NotFoundException(`Subscriber with ID ${id} not found`);
    }

    return {
      code: 200,
      message: "Subscriber deleted successfully",
      data: { id },
    };
  }

  async deleteBulkSubscribers(ids) {
    if (!ids || ids.length === 0) {
      throw new BadRequestException("No IDs provided for deletion");
    }

    const result = await this.newsletterModel.deleteMany({
      _id: { $in: ids },
    });

    if (result.deletedCount === 0) {
      throw new NotFoundException("No subscribers found to delete");
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
