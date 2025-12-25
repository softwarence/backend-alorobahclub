import {
  Controller,
  Post,
  Body,
  Patch,
  Param,
  Get,
  Query,
  Delete,
  UseGuards,
} from "@nestjs/common";
import { NewsletterService } from "./newsletters.service";
import { CreateNewsletterDto } from "./dto/create-newsletter.dto";
import { Roles } from "../auth/role/roles.decorator";
import { Role } from "../auth/role/roles.enum";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@Controller("newsletters")
export class NewsletterController {
  constructor(private readonly newsletterService: NewsletterService) {}

  @Post()
  subscribe(@Body() dto: CreateNewsletterDto) {
    return this.newsletterService.subscribe(dto);
  }

  @Get()
  getActiveSubscribers(@Query() query) {
    return this.newsletterService.findAll(query);
  }

  @Delete("bulk")
  @UseGuards(JwtAuthGuard)
  @Roles(Role.ADMIN)
  deleteBulk(@Body("ids") ids) {
    return this.newsletterService.deleteBulkSubscribers(ids);
  }

  @Patch(":email")
  @UseGuards(JwtAuthGuard)
  @Roles(Role.ADMIN)
  unsubscribe(@Param("email") email: string) {
    return this.newsletterService.unsubscribe(email);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  @Roles(Role.ADMIN)
  deleteSingle(@Param("id") id) {
    return this.newsletterService.deleteSubscriber(id);
  }
}
