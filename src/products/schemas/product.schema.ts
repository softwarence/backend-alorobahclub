import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Types } from "mongoose";

@Schema({ timestamps: true })
export class Product {
  @Prop({
    type: {
      en: String,
      ar: String,
    },
    required: true,
  })
  title: { en: string; ar: string };

  @Prop({
    type: {
      en: String,
      ar: String,
    },
    required: true,
  })
  description: { en: string; ar: string };

  @Prop({ required: true })
  slug: string;

  @Prop({ type: [Types.ObjectId], ref: "Category" })
  categoryIds: Types.ObjectId[];

  @Prop()
  brand: string;

  @Prop([String])
  images: string[];

  @Prop([
    {
      sku: { type: String, required: true },
      attributes: {
        size: String,
        color: String,
      },
      price: Number,
      compareAtPrice: Number,
      stock: Number,
    },
  ])
  variants: any[];

  @Prop({
    enum: ["active", "draft", "archived"],
    default: "draft",
  })
  status: string;

  @Prop({ default: false })
  isFeatured: boolean;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
ProductSchema.index({ slug: 1 }, { unique: true });
ProductSchema.index({ status: 1 });
ProductSchema.index({ categoryIds: 1 });
ProductSchema.index({ "variants.sku": 1 }, { unique: true });
