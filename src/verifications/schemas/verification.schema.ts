import { Prop, SchemaFactory, Schema } from '@nestjs/mongoose';
import { Types, Document } from 'mongoose';

export type verificationDocument = Verification & Document;

@Schema({ timestamps: true })
export class Verification {
  @Prop({ type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId;

  @Prop()
  token: string;

  @Prop()
  expiresAt: Date;

  @Prop({ default: Date.now })
  createdAt: Date;
}

export const VerificationSchema = SchemaFactory.createForClass(Verification);
VerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
VerificationSchema.index({ userId: 1 });
