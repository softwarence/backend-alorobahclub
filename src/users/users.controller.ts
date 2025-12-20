import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  Req,
  NotFoundException,
  Delete,
  Param,
  BadRequestException,
} from "@nestjs/common";
import { UsersService } from "./users.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { UpdateUserDto } from "./dto/update-user.dto";
import type { Request } from "express";
import { RolesGuard } from "../auth/role/roles.guard";
import { Role } from "../auth/role/roles.enum";
import { Roles } from "../auth/role/roles.decorator";

@Controller("users")
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get("me")
  async getMe(@Req() req: Request) {
    const userId = req.user?.sub ?? "undefined";

    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return {
      data: {
        id: user._id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        dateOfBirth: user.dateOfBirth,
        isVerified: user.isVerified,
      },
    };
  }

  @Patch("me")
  async updateMe(@Req() req: Request, @Body() dto: UpdateUserDto) {
    const userId = req.user?.sub ?? "undefined";

    const user = await this.usersService.updateProfile(userId, dto);

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return {
      code: 200,
      message: "Profile updated",
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        dateOfBirth: user.dateOfBirth,
        address: user.addresses,
        role: user.role,
      },
    };
  }

  @Delete("me")
  async deleteMe(@Req() req: Request) {
    const userId = req.user?.sub ?? "undefined";
    await this.usersService.deleteSelf(userId);
    return {
      code: 204,
      message: "Your account has been deleted",
    };
  }

  @Delete("bulk")
  @Roles(Role.ADMIN)
  async deleteMany(@Body("userIds") userIds: string[]) {
    if (!Array.isArray(userIds) || userIds.length === 0) {
      throw new BadRequestException("userIds must be a non-empty array");
    }

    await this.usersService.deleteManyByAdmin(userIds);

    return {
      message: `${userIds.length} users and their data deleted successfully`,
    };
  }

  @Get("all-devices")
  async getDevices(@Req() req: Request) {
    const userId = req.user?.sub ?? "undefined";
    const devices = await this.usersService.findAllDevices(userId);
    const response = devices.map((device) => ({
      id: device._id,
      deviceId: device.deviceId,
      userAgent: device.userAgent,
      lastLogin: device.lastLogin,
    }));
    return {
      code: 200,
      message: "Devices retrieved successfully",
      data: response,
    };
  }

  @Delete(":id")
  @Roles(Role.ADMIN)
  async deleteUser(@Param("id") targetId: string) {
    await this.usersService.deleteById(targetId);

    return {
      message: `User ${targetId} and all associated data deleted successfully`,
    };
  }
}
