import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type BlogDocument = Blog & Document;

@Schema({ timestamps: true })
export class Blog {
  @Prop({
    type: {
      en: { type: String, required: true },
      ar: { type: String, required: true },
    },
    required: true,
  })
  title: {
    en: string;
    ar: string;
  };

  @Prop({
    type: {
      en: { type: String, required: true },
      ar: { type: String, required: true },
    },
    required: true,
  })
  content: {
    en: string;
    ar: string;
  };

  @Prop({ required: true, unique: true, index: true })
  slug: string;

  @Prop({
    enum: ["published", "draft"],
    default: "draft",
  })
  status: "published" | "draft";
}

export const BlogSchema = SchemaFactory.createForClass(Blog);
