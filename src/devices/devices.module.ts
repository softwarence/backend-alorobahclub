import { Module } from '@nestjs/common';
import { DevicesService } from './devices.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Device, DeviceSchema } from './schemas/device.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Device.name, schema: DeviceSchema }]),
  ],
  providers: [DevicesService],
  exports: [DevicesService],
})
export class DevicesModule {}
