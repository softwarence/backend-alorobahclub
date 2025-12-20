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
  UnauthorizedException,
  BadRequestException,
  HttpCode,
} from "@nestjs/common";
import type { Request } from "express";
import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import type { Response } from "express";
import { ConfigService } from "@nestjs/config";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService
  ) {}

  @Post("register")
  async register(
    @Body() registerDto: RegisterDto,
    @Headers("x-device-id") deviceId: string,
    @Headers("user-agent") userAgent: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const { user, tokens } = await this.authService.register(
      registerDto,
      userAgent,
      deviceId,
      req.ip ?? "unknown"
    );

    res.cookie("refresh_token", tokens.refreshToken, {
      httpOnly: true,
      // secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    return {
      code: 201,
      message: "Registration successful",
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
        accessToken: tokens.accessToken,
      },
    };
  }

  @Post("login")
  async login(
    @Body() loginDto: LoginDto,
    @Headers("user-agent") userAgent: string,
    @Headers("x-device-id") deviceId: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    if (!deviceId) {
      throw new BadRequestException("Device ID is required");
    }

    const { user, tokens } = await this.authService.login(
      loginDto,
      userAgent,
      deviceId,
      req.ip ?? "unknown"
    );

    res.cookie("refresh_token", tokens.refreshToken, {
      httpOnly: true,
      // secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    return {
      code: 200,
      message: "Login successful",
      data: {
        user: {
          _id: user._id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          dateOfBirth: user.dateOfBirth,
          address: user.addresses,
        },
        device: { id: deviceId, userAgent, ipAddress: req.ip },
        accessToken: tokens.accessToken,
      },
    };
  }

  @Post("resend-verification")
  async resendVerification(@Body("email") email: string) {
    return await this.authService.resendVerification(email);
  }

  @Get("verify-email")
  async verifyEmail(@Query("token") token: string, @Res() res: Response) {
    const baseUrl = this.configService.get<string>("BASE_URL");
    try {
      await this.authService.verifyEmail(token);
      return res.redirect(`${baseUrl}?status=success`);
    } catch (error) {
      console.log("Error found", error);
      return res.redirect(`${baseUrl}?status=failed`);
    }
  }

  @Post("logout")
  @UseGuards(JwtAuthGuard)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.refresh_token;

    if (!refreshToken) {
      throw new UnauthorizedException("No refresh token found in cookies");
    }

    await this.authService.logout(refreshToken);

    res.clearCookie("refresh_token", {
      httpOnly: true,
      // secure: true,
      sameSite: "lax",
      path: "/",
    });

    return {
      code: 200,
      message: "Logged out successfully",
    };
  }

  @Post("logout/all-devices")
  @UseGuards(JwtAuthGuard)
  async logoutAll(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const userId = req.user?.sub ?? "undefined";

    await this.authService.logoutAllDevices(userId);

    res.clearCookie("refresh_token", {
      httpOnly: true,
      // secure: true,
      sameSite: "lax",
      path: "/auth/refresh",
    });

    return {
      message: "Logged out from all devices",
    };
  }

  @Post("request-password")
  @HttpCode(200)
  async requestResetPassword(@Body("email") email: string) {
    return await this.authService.requestPasswordReset(email);
  }

  @Post("verify-code")
  @HttpCode(200)
  async verifyCode(@Body("email") email: string, @Body("code") code: string) {
    return await this.authService.verifyResetCode(email, code);
  }

  @Post("reset-password")
  @HttpCode(200)
  async resetPassword(
    @Body("email") email: string,
    @Body("code") code: string,
    @Body("newPassword") newPassword: string
  ) {
    return await this.authService.resetPassword(email, code, newPassword);
  }

  @Post("refresh-token")
  async refreshToken(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Headers("x-device-id") deviceId: string
  ) {
    if (!deviceId) throw new BadRequestException("Device ID missing");

    const refreshToken = req.cookies["refresh_token"];
    if (!refreshToken) throw new UnauthorizedException("Refresh token missing");

    const tokens = await this.authService.refreshAccessToken(
      refreshToken,
      deviceId
    );

    res.cookie("refresh_token", tokens.refreshToken, {
      httpOnly: true,
      // secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return { accessToken: tokens.accessToken };
  }
}
