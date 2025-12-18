import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type DeviceDocument = Device & Document;

@Schema({ timestamps: true })
export class Device {
  @Prop({ type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId;

  @Prop()
  deviceId: string;

  @Prop()
  refreshToken: string;

  @Prop({ required: true, index: { expires: 0 } })
  refreshTokenExpiresAt: Date;

  @Prop({ default: false })
  isRevoked: boolean;

  @Prop({ default: Date.now })
  lastLogin: Date;

  @Prop()
  userAgent: string;

  @Prop()
  ipAddress: string;
}

export const DeviceSchema = SchemaFactory.createForClass(Device);
DeviceSchema.index({ userId: 1, deviceId: 1 }, { unique: true });
