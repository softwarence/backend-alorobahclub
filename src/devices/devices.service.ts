import { Injectable, UnauthorizedException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { ClientSession, Model, Types } from "mongoose";
import { Device } from "./schemas/device.schema";

@Injectable()
export class DevicesService {
  constructor(
    @InjectModel(Device.name) private readonly deviceModel: Model<Device>
  ) {}

  async validateSession(userId: Types.ObjectId, deviceId: string) {
    const device = await this.deviceModel.findOne({
      userId,
      deviceId,
      isRevoked: false,
    });

    if (!device) throw new UnauthorizedException("Session revoked or invalid");

    return device;
  }

  async createOrUpdateDevice(
    userId: Types.ObjectId,
    deviceId: string,
    refreshTokenHash: string,
    userAgent: string,
    ipAddress: string
  ) {
    return this.deviceModel.findOneAndUpdate(
      { userId, deviceId },
      {
        refreshToken: refreshTokenHash,
        refreshTokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        userAgent,
        ipAddress,
        lastLogin: new Date(),
        isRevoked: false,
      },
      { upsert: true, new: true }
    );
  }

  async getAllDevices(userId: Types.ObjectId) {
    return this.deviceModel.find({ userId });
  }

  async revokeDevice(refreshTokenHash: string) {
    return this.deviceModel.updateOne(
      { refreshToken: refreshTokenHash },
      { isRevoked: true, refreshToken: null, refreshTokenExpiresAt: new Date() }
    );
  }

  async revokeAllDevices(userIds: Types.ObjectId[], session?: ClientSession) {
    return this.deviceModel.deleteMany(
      { userId: { $in: userIds } },
      session ? { session } : {}
    );
  }

  async validateDeviceByRefreshTokenAndDevice(
    refreshTokenHash: string,
    deviceId: string
  ) {
    return this.deviceModel.findOne({
      refreshToken: refreshTokenHash,
      deviceId,
    });
  }

  async updateRefreshToken(deviceId: Types.ObjectId, refreshTokenHash: string) {
    return this.deviceModel.findByIdAndUpdate(
      deviceId,
      {
        refreshToken: refreshTokenHash,
        refreshTokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      { new: true }
    );
  }
}
