import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Types } from "mongoose";

export type CategoryDocument = Category & Document;

@Schema({ timestamps: true })
export class Category {
  @Prop({
    type: {
      en: { type: String, required: true },
      ar: { type: String, required: true },
    },
    required: true,
  })
  name: {
    en: string;
    ar: string;
  };

  @Prop({ required: true })
  slug: string;

  @Prop({ type: Types.ObjectId, ref: "Category", default: null })
  parentId: Types.ObjectId | null;

  @Prop({ required: true })
  level: number;

  @Prop({ default: true })
  isActive: boolean;
}

export const CategorySchema = SchemaFactory.createForClass(Category);
CategorySchema.index({ slug: 1 }, { unique: true });
CategorySchema.index({ parentId: 1 });
CategorySchema.index({ level: 1 });
