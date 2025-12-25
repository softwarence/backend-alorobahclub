import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type NewsletterDocument = Newsletter & Document;

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class Newsletter {
  @Prop({
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  })
  email: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const NewsletterSchema = SchemaFactory.createForClass(Newsletter);
