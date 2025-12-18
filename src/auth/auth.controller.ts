import {
  Body,
  Controller,
  Post,
  Req,
  Headers,
  Query,
  Res,
  Get,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('register')
  async register(
    @Body() registerDto: RegisterDto,
    @Headers('x-device-id') deviceId: string,
    @Headers('user-agent') userAgent: string,
    @Req() req: Request,
  ) {
    const { user, tokens } = await this.authService.register(
      registerDto,
      userAgent,
      deviceId,
      req.ip ?? 'unknown',
    );

    return {
      code: 201,
      message: 'Registration successful',
      data: {
        user: {
          _id: user._id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          dateOfBirth: user.dateOfBirth,
          address: user.addresses,
        },
        device: {
          id: deviceId,
          userAgent,
          ipAddress: req.ip,
        },
        tokens,
      },
    };
  }

  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Headers('user-agent') userAgent: string,
    @Headers('x-device-id') deviceId: string,
    @Req() req: Request,
  ) {
    const { user, tokens } = await this.authService.login(
      loginDto,
      userAgent,
      deviceId,
      req.ip ?? 'unknown',
    );
    return {
      code: 200,
      message: 'Login successful',
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          dateOfBirth: user.dateOfBirth,
          addresses: user.addresses,
        },
        device: {
          id: deviceId,
          userAgent,
          ipAddress: req.ip,
        },
        tokens,
      },
    };
  }

  @Post('resend-verification')
  async resendVerification(@Body('email') email: string) {
    return await this.authService.resendVerification(email);
  }

  @Get('verify-email')
  async verifyEmail(@Query('token') token: string, @Res() res: Response) {
    const baseUrl = this.configService.get<string>('BASE_URL');
    try {
      await this.authService.verifyEmail(token);
      return res.redirect(`${baseUrl}?status=success`);
    } catch (error) {
      console.log('Error found', error);
      return res.redirect(`${baseUrl}?status=failed`);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Body('refreshToken') refreshToken: string) {
    await this.authService.logout(refreshToken);
    return {
      code: 200,
      message: 'Logged out from this device successfully',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  async logoutAll(@Req() req: Request) {
    const userId = req.user!.sub;
    await this.authService.logoutAll(userId);
    return {
      code: 200,
      message: 'Logged out from all devices successfully',
    };
  }

  @Post('reset-password')
  async resetPassword(
    @Body('email') email: string,
    @Body('newPassword') newPassword: string,
  ) {
    const result = await this.authService.resetPassword(email, newPassword);
    return {
      code: 200,
      message: 'Password reset successfully',
      data: result,
    };
  }
}
