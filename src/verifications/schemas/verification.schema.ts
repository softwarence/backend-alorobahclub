import { Prop, SchemaFactory, Schema } from "@nestjs/mongoose";
import { Types, Document } from "mongoose";

export type verificationDocument = Verification & Document;

@Schema({ timestamps: true })
export class Verification {
  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  token: string;

  @Prop({
    required: true,
    enum: ["email_verify", "password_reset"],
  })
  purpose: "email_verify" | "password_reset";

  @Prop({ default: false })
  isUsed: boolean;

  @Prop({ required: true })
  expiresAt: Date;
}

export const VerificationSchema = SchemaFactory.createForClass(Verification);
VerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
VerificationSchema.index({ userId: 1, purpose: 1 });
