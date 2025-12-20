import { Injectable, UnauthorizedException } from "@nestjs/common";
import { Verification } from "./schemas/verification.schema";
import { Model } from "mongoose";
import { InjectModel } from "@nestjs/mongoose";
import { createHash } from "crypto";
import { hashToken } from "../auth/utils/token.util";

@Injectable()
export class VerificationService {
  constructor(
    @InjectModel(Verification.name)
    private readonly verificationModel: Model<Verification>
  ) {}

  async create(
    userId: string,
    purpose: "email_verify" | "password_reset",
    rawToken: string,
    ttlMs: number
  ) {
    const tokenHash = hashToken(rawToken);

    return this.verificationModel.create({
      userId,
      purpose,
      token: tokenHash,
      expiresAt: new Date(Date.now() + ttlMs),
    });
  }

  async verify(
    token: string,
    purpose: "email_verify" | "password_reset"
  ): Promise<string> {
    const tokenHash = hashToken(token);

    const record = await this.verificationModel.findOne({
      token: tokenHash,
      purpose,
      isUsed: false,
      expiresAt: { $gt: new Date() },
    });

    if (!record) {
      throw new UnauthorizedException("Invalid or expired verification token");
    }

    record.isUsed = true;
    await record.save();

    return record.userId.toString();
  }
}
