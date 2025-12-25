import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Types } from "mongoose";

@Schema({ timestamps: true })
export class Order {
  @Prop({ required: true })
  orderNumber: string;

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  userId: Types.ObjectId;

  @Prop([
    {
      productId: { type: Types.ObjectId, ref: "Product" },
      variantId: { type: Types.ObjectId },
      titleSnapshot: {
        en: String,
        ar: String,
      },
      price: Number,
      quantity: Number,
    },
  ])
  items: {
    productId: Types.ObjectId;
    variantId: Types.ObjectId;
    titleSnapshot: { en: string; ar: string };
    price: number;
    quantity: number;
  }[];

  @Prop()
  subtotal: number;

  @Prop()
  shippingFee: number;

  @Prop()
  total: number;

  @Prop({ default: "SAR" })
  currency: string;

  @Prop({
    enum: ["apple_pay", "mada", "visa", "mastercard", "cod"],
    required: true,
  })
  paymentMethod: string;

  @Prop({
    enum: ["pending", "paid", "failed"],
    default: "pending",
  })
  paymentStatus: string;

  @Prop({
    enum: ["pending", "confirmed", "shipped", "completed", "cancelled"],
    default: "pending",
  })
  orderStatus: string;

  @Prop({ type: Object })
  shippingAddress: Record<string, any>;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
OrderSchema.index({ orderNumber: 1 }, { unique: true });
OrderSchema.index({ userId: 1 });
OrderSchema.index({ createdAt: -1 });
