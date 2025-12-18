import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Device } from './schemas/device.schema';

@Injectable()
export class DevicesService {
  constructor(
    @InjectModel(Device.name) private readonly deviceModel: Model<Device>,
  ) {}

  async validateSession(userId: string, deviceId: string) {
    const device = await this.deviceModel.findOne({
      userId,
      deviceId,
      isRevoked: false,
    });

    if (!device) throw new UnauthorizedException('Session revoked or invalid');

    return device;
  }
}
