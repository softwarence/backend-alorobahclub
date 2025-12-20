import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { UsersService } from "../users/users.service";
import { AccountService } from "../accounts/accounts.service";
import { DevicesService } from "../devices/devices.service";
import { JwtService } from "@nestjs/jwt";
import { randomBytes, createHmac } from "crypto";
import argon2 from "argon2";

import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { VerificationService } from "../verifications/verifications.service";
import { MailService } from "../mail/mail.service";
import { Types } from "mongoose";
import { generateOtp, hashToken } from "./utils/token.util";

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly accountService: AccountService,
    private readonly deviceService: DevicesService,
    private readonly verificationService: VerificationService,
    private readonly mailService: MailService,
    private readonly jwtService: JwtService
  ) {}

  async register(
    registerDto: RegisterDto,
    userAgent: string,
    deviceId: string,
    ipAddress: string
  ) {
    const { name, email, phone, dateOfBirth, password } = registerDto;

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await this.usersService.findByEmail(normalizedEmail);
    if (existingUser) {
      throw new ConflictException("Email already registered");
    }

    const passwordHash = await argon2.hash(password);

    const user = await this.usersService.createUser({
      name,
      email: normalizedEmail,
      phone,
      dateOfBirth,
    });

    void this.accountService
      .createAccount(
        user._id.toString(),
        "credentials",
        normalizedEmail,
        passwordHash
      )
      .catch((error) => console.error("Error creating account:", error));

    const verificationToken = randomBytes(32).toString("hex");

    void this.verificationService
      .create(
        user._id.toString(),
        "email_verify",
        verificationToken,
        24 * 60 * 60 * 1000
      )
      .catch((error) =>
        console.error("Error creating verification token:", error)
      );

    void this.mailService
      .sendVerificationEmail(normalizedEmail, verificationToken)
      .catch((error) => console.error("Error sending email:", error));

    const refreshToken = randomBytes(64).toString("hex");
    const refreshTokenHash = hashToken(refreshToken);
    await this.deviceService.createOrUpdateDevice(
      new Types.ObjectId(user._id.toString()),
      deviceId,
      refreshTokenHash,
      userAgent,
      ipAddress
    );

    const accessToken = this.signAccessToken(user._id.toString(), deviceId);

    return { user, tokens: { accessToken, refreshToken } };
  }

  async login(
    loginDto: LoginDto,
    userAgent: string,
    deviceId: string,
    ipAddress: string
  ) {
    const account = await this.accountService.findByEmail(
      loginDto.email.toLowerCase().trim()
    );
    if (!account) throw new UnauthorizedException("Invalid credentials");

    const isValid = await argon2.verify(account.password, loginDto.password);
    if (!isValid) throw new UnauthorizedException("Invalid credentials");

    const user = await this.usersService.findByEmail(account.providerAccountId);
    if (!user) throw new NotFoundException("User not found");

    const refreshToken = randomBytes(64).toString("hex");
    const refreshTokenHash = hashToken(refreshToken);

    await this.deviceService.createOrUpdateDevice(
      new Types.ObjectId(user._id.toString()),
      deviceId,
      refreshTokenHash,
      userAgent,
      ipAddress
    );

    const accessToken = this.signAccessToken(
      user._id.toString(),
      deviceId,
      user.role
    );

    return { user, tokens: { accessToken, refreshToken } };
  }

  async logout(refreshToken: string) {
    const refreshTokenHash = hashToken(refreshToken);
    await this.deviceService.revokeDevice(refreshTokenHash);
    return { success: true };
  }

  async logoutAllDevices(userId: string) {
    const objectId = new Types.ObjectId(userId);
    await this.deviceService.revokeAllDevices([objectId]);
    return { success: true };
  }

  async verifyEmail(token: string) {
    const userId = await this.verificationService.verify(token, "email_verify");

    await this.usersService.markEmailVerified(userId);

    return { message: "Email verified successfully" };
  }

  async resendVerification(email: string) {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.usersService.findByEmail(normalizedEmail);
    if (!user) throw new NotFoundException("User not found");
    if (user.isVerified) throw new ConflictException("Email already verified");

    const token = randomBytes(32).toString("hex");
    await this.verificationService.create(
      user._id.toString(),
      "email_verify",
      token,
      1 * 60 * 60 * 1000
    );

    void this.mailService
      .sendVerificationEmail(normalizedEmail, token)
      .catch((error) => console.error("Error sending email:", error));

    return { message: "Verification email sent" };
  }

  async requestPasswordReset(email: string) {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.usersService.findByEmail(normalizedEmail);

    if (!user) {
      throw new NotFoundException("User not found");
    }

    const code = generateOtp();

    await this.verificationService.create(
      user._id.toString(),
      "password_reset",
      code,
      10 * 60 * 1000
    );

    void this.mailService
      .sendPasswordResetCode(normalizedEmail, code)
      .catch((error) => console.error("Error sending email:", error));

    return { message: "A password reset code has been sent to your email" };
  }

  async verifyResetCode(email: string, code: string) {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.usersService.findByEmail(normalizedEmail);
    if (!user) throw new NotFoundException("User not found");

    const isValid = await this.verificationService.verify(
      code,
      "password_reset"
    );
    if (!isValid)
      throw new BadRequestException("Invalid or expired verification code");

    return { message: "Verification code is valid" };
  }

  async resetPassword(email: string, code: string, newPassword: string) {
    const session = await this.usersService["userModel"].db.startSession();
    session.startTransaction();

    try {
      const normalizedEmail = email.toLowerCase().trim();
      const user = await this.usersService.findByEmail(normalizedEmail);
      if (!user) throw new NotFoundException("User not found");

      await this.verificationService.verify(code, "password_reset");

      const account = await this.accountService.findByUserId(
        user._id.toString()
      );
      if (!account) throw new NotFoundException("Account not found");

      const hashedPassword = await argon2.hash(newPassword);
      await this.accountService.updatePassword(
        account._id.toString(),
        hashedPassword
      );

      const objectId = new Types.ObjectId(user._id.toString());
      await this.deviceService.revokeAllDevices([objectId], session);

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }

    return { message: "Password reset successful" };
  }

  async refreshAccessToken(refreshToken: string, deviceId: string) {
    const refreshTokenHash = hashToken(refreshToken);

    const device =
      await this.deviceService.validateDeviceByRefreshTokenAndDevice(
        refreshTokenHash,
        deviceId
      );

    if (!device) throw new UnauthorizedException("Invalid refresh token");
    if (device.isRevoked)
      throw new UnauthorizedException("Refresh token revoked");
    if (device.refreshTokenExpiresAt < new Date())
      throw new UnauthorizedException("Refresh token expired");

    const user = await this.usersService.findById(device.userId.toString());
    if (!user) throw new NotFoundException("User not found");

    const accessToken = this.signAccessToken(
      user._id.toString(),
      deviceId,
      user.role
    );

    const newRefreshToken = randomBytes(64).toString("hex");
    const newRefreshTokenHash = hashToken(newRefreshToken);

    await this.deviceService.updateRefreshToken(
      device._id,
      newRefreshTokenHash
    );

    return { accessToken, refreshToken: newRefreshToken };
  }

  private signAccessToken(userId: string, deviceId: string, role = "USER") {
    return this.jwtService.sign(
      {
        sub: userId,
        deviceId,
        role,
      },
      { expiresIn: "15m" }
    );
  }
}
