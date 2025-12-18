import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Verification } from './schemas/verification.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { createHash } from 'crypto';

@Injectable()
export class VerificationService {
  constructor(
    @InjectModel(Verification.name)
    private verificationModel: Model<Verification>,
  ) {}

  async createToken(userId: string, rawToken: string) {
    const hashedToken = createHash('sha256').update(rawToken).digest('hex');
    return this.verificationModel.create({
      userId,
      token: hashedToken,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    });
  }

  async findAndVerify(rawToken: string) {
    const hashedToken = createHash('sha256').update(rawToken).digest('hex');
    const record = await this.verificationModel.findOne({ token: hashedToken });

    if (!record) {
      throw new UnauthorizedException('Invalid or expired verification token');
    }

    if (record.expiresAt < new Date()) {
      throw new UnauthorizedException('Verification token has expired');
    }

    await this.verificationModel.deleteOne({ _id: record._id });
    return record.userId;
  }
}
