import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type DeviceDocument = Device & Document;

@Schema({ timestamps: true })
export class Device {
  @Prop({ type: Types.ObjectId, ref: "User", required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  deviceId: string;

  @Prop({ index: true })
  refreshToken: string;

  @Prop({ index: true, expires: "30d" })
  refreshTokenExpiresAt: Date;

  @Prop({ default: false, index: true })
  isRevoked: boolean;

  @Prop({ default: Date.now })
  lastLogin: Date;

  @Prop()
  userAgent?: string;

  @Prop()
  ipAddress?: string;
}

export const DeviceSchema = SchemaFactory.createForClass(Device);

DeviceSchema.index({ userId: 1, deviceId: 1 }, { unique: true });
