import { Module } from "@nestjs/common";
import { NewsletterService } from "./newsletters.service";
import { NewsletterController } from "./newsletters.controller";
import { MongooseModule } from "@nestjs/mongoose";
import { Newsletter, NewsletterSchema } from "./schemas/newsletter.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Newsletter.name, schema: NewsletterSchema },
    ]),
  ],
  controllers: [NewsletterController],
  providers: [NewsletterService],
})
export class NewslettersModule {}
