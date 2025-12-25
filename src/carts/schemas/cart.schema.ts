// cart/schemas/cart.schema.ts
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export interface CartItem {
  productId: Types.ObjectId;
  variantId?: Types.ObjectId | null;
  quantity: number;
  price: number;
}

@Schema({ timestamps: true })
export class Cart extends Document {
  @Prop({ type: Types.ObjectId, ref: "User", required: false })
  userId?: Types.ObjectId;

  @Prop({ type: String, required: false })
  guestId?: string;

  @Prop([
    {
      productId: { type: Types.ObjectId, ref: "Product", required: true },
      variantId: { type: Types.ObjectId, default: null },
      quantity: { type: Number, required: true, default: 1 },
      price: { type: Number, required: true },
    },
  ])
  items: CartItem[];

  // 🔥 TTL field
  @Prop({ type: Date, required: false })
  expiresAt?: Date;
}

export const CartSchema = SchemaFactory.createForClass(Cart);

// Uniqueness
CartSchema.index({ userId: 1 }, { unique: true, sparse: true });
CartSchema.index({ guestId: 1 }, { unique: true, sparse: true });

// ✅ TTL index (MongoDB will auto-delete)
CartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
