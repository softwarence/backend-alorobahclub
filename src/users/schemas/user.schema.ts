import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ type: Object, required: true })
  name: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  phone: string;

  @Prop()
  dateOfBirth?: Date;

  @Prop({ default: 'user', enum: ['user', 'admin'] })
  role?: string;

  @Prop({ default: false })
  isVerified?: boolean;

  @Prop({ default: false })
  isBlocked?: boolean;

  @Prop({ default: 'en', enum: ['en', 'ar'] })
  locale?: string;

  @Prop({ default: 'SAR' })
  currency?: string;

  @Prop({
    type: [
      {
        _id: { type: Types.ObjectId, auto: true },
        label: String,
        city: String,
        addressLine: String,
        postalCode: String,
        country: { type: String, default: 'SA' },
        isDefault: { type: Boolean, default: false },
      },
    ],
    default: [],
  })
  addresses?: any[];
}

export const UserSchema = SchemaFactory.createForClass(User);
