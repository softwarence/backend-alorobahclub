import { Module } from '@nestjs/common';
import { VerificationService } from './verifications.service';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Verification,
  VerificationSchema,
} from './schemas/verification.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Verification.name, schema: VerificationSchema },
    ]),
  ],
  providers: [VerificationService],
  exports: [VerificationService],
})
export class VerificationsModule {}
