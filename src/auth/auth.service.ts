import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Account } from '../accounts/schemas/account.schema';
import { Device } from '../devices/schemas/device.schema';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { randomBytes, createHash } from 'crypto';
import argon2 from 'argon2';

import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerificationService } from '../verifications/verifications.service';
import { MailService } from '../mail/mail.service';
import type { AuthTokens } from './types/auth-tokens.type';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,

    @InjectModel(Account.name)
    private readonly accountModel: Model<Account>,

    @InjectModel(Device.name)
    private readonly deviceModel: Model<Device>,

    private readonly verificationService: VerificationService,
    private readonly mailService: MailService,
    private readonly jwtService: JwtService,
  ) {}

  async register(
    registerDto: RegisterDto,
    userAgent: string,
    deviceId: string,
    ipAddress: string,
  ) {
    const { name, email, phone, dateOfBirth, password } = registerDto;

    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await argon2.hash(password);

    const user = await this.usersService.createUser({
      name,
      email,
      phone,
      dateOfBirth,
    });

    await this.accountModel.create({
      userId: user._id,
      provider: 'credentials',
      providerAccountId: email,
      password: passwordHash,
    });

    const verificationToken = randomBytes(32).toString('hex');
    await this.verificationService.createToken(
      user._id.toString(),
      verificationToken,
    );

    void this.mailService
      .sendVerificationEmail(email, verificationToken)
      .catch((error) =>
        console.log('error sending mail in the background', error),
      );

    const tokens = await this.createSession(
      user._id.toString(),
      userAgent,
      deviceId,
      ipAddress,
    );

    return { user, tokens };
  }

  async login(
    loginDto: LoginDto,
    userAgent: string,
    deviceId: string,
    ipAddress: string,
  ) {
    const account = await this.accountModel.findOne({
      provider: 'credentials',
      providerAccountId: loginDto.email,
    });

    if (!account) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await argon2.verify(account.password, loginDto.password);

    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const tokens = await this.createSession(
      account.userId.toString(),
      userAgent,
      deviceId,
      ipAddress,
    );

    return { user, tokens };
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const refreshTokenHash = this.hashToken(refreshToken);

    const device = await this.deviceModel.findOne({
      refreshTokenHash,
      isRevoked: false,
    });

    if (!device) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const newRefreshToken = randomBytes(64).toString('hex');
    const newRefreshTokenHash = this.hashToken(newRefreshToken);

    device.refreshToken = newRefreshTokenHash;
    device.refreshTokenExpiresAt = this.refreshTokenExpiry();
    await device.save();

    const accessToken = this.signAccessToken(
      device.userId.toString(),
      device.deviceId,
    );

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(refreshToken: string) {
    const refreshTokenHash = this.hashToken(refreshToken);

    await this.deviceModel.updateOne({ refreshTokenHash }, { isRevoked: true });

    return { success: true };
  }

  async logoutAll(userId: string) {
    await this.deviceModel.updateMany({ userId }, { isRevoked: true });

    return { success: true };
  }

  async verifyEmail(token: string) {
    const userId = await this.verificationService.findAndVerify(token);

    if (!userId) {
      throw new UnauthorizedException('Invalid or expired verification token');
    }

    await this.usersService.markEmailVerified(userId.toString());

    return { message: 'Email verified successfully' };
  }

  async resendVerification(email: string) {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.usersService.findByEmail(normalizedEmail);

    if (!user) throw new NotFoundException('User not found');
    if (user.isVerified) throw new ConflictException('Email already verified');

    const token = randomBytes(32).toString('hex');
    await this.verificationService.createToken(user._id.toString(), token);
    void this.mailService
      .sendVerificationEmail(user.email, token)
      .catch((error) =>
        console.log('error sending mail in the background', error),
      );

    return { message: 'Verification email sent' };
  }

  async resetPassword(email: string, newPassword: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new NotFoundException('User not found');

    const account = await this.accountModel.findOne({
      provider: 'credentials',
      providerAccountId: email,
    });

    if (!account) throw new NotFoundException('Account not found');

    const hashed = await argon2.hash(newPassword);
    account.password = hashed;
    await account.save();

    await this.logoutAll(user._id.toString());

    return { userId: user._id };
  }

  private async createSession(
    userId: string,
    userAgent: string,
    providedDeviceId: string,
    ipAddress: string,
  ): Promise<AuthTokens> {
    const deviceId =
      providedDeviceId ||
      this.hashToken(userAgent + randomBytes(16).toString('hex'));

    const refreshToken = randomBytes(64).toString('hex');
    const refreshTokenHash = this.hashToken(refreshToken);

    await this.deviceModel.findOneAndUpdate(
      { userId, deviceId },
      {
        userId,
        deviceId,
        refreshToken: refreshTokenHash,
        refreshTokenExpiresAt: this.refreshTokenExpiry(),
        userAgent,
        ipAddress,
        lastLogin: new Date(),
        isRevoked: false,
      },
      { upsert: true, new: true },
    );

    const accessToken = this.signAccessToken(userId, deviceId);

    return { accessToken, refreshToken };
  }

  private signAccessToken(userId: string, deviceId: string): string {
    return this.jwtService.sign(
      { sub: userId, deviceId },
      { expiresIn: '15m' },
    );
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private refreshTokenExpiry(): Date {
    return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  }
}
