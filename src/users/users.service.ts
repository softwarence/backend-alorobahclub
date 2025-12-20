import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types, ClientSession } from "mongoose";
import { User } from "./schemas/user.schema";
import { UpdateUserDto } from "./dto/update-user.dto";
import { DevicesService } from "../devices/devices.service";
import { AccountService } from "../accounts/accounts.service";

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly deviceService: DevicesService,
    private readonly accountService: AccountService
  ) {}

  async createUser(data: {
    name: string;
    email: string;
    phone?: string;
    dateOfBirth?: string;
  }) {
    data.email = data.email.toLowerCase().trim();
    return this.userModel.create(data);
  }

  async findByEmail(email: string) {
    if (!email) return null;
    return this.userModel.findOne({ email: email.toLowerCase().trim() });
  }

  async markEmailVerified(userId: string) {
    const updatedUser = await this.userModel
      .findByIdAndUpdate(userId, { isVerified: true }, { new: true })
      .exec();

    if (!updatedUser) {
      throw new NotFoundException("User not found during verification");
    }
    return updatedUser;
  }

  async findById(userId: string) {
    return this.userModel.findById(userId);
  }

  async updateProfile(userId: string, update: UpdateUserDto) {
    console.log("Update payload received:", update);

    const result = await this.userModel
      .findByIdAndUpdate(
        userId,
        { $set: update },
        { new: true, runValidators: true }
      )
      .exec();
    return result;
  }

  async deleteSelf(userId: string) {
    const session = await this.userModel.db.startSession();
    session.startTransaction();
    try {
      const deletedUser = await this.userModel
        .findByIdAndDelete(userId)
        .session(session);

      if (!deletedUser) {
        throw new NotFoundException("User not found");
      }

      const objectId = new Types.ObjectId(userId);

      await Promise.all([
        this.accountService.deleteAccountsByUserIds([objectId], session),
        this.deviceService.revokeAllDevices([objectId], session),
      ]);

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      console.error(`Delete failed: ${error.message}`);
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async deleteById(userId: string) {
    const session = await this.userModel.db.startSession();
    session.startTransaction();
    try {
      const objectId = new Types.ObjectId(userId);

      const result = await this.userModel
        .deleteOne({ _id: objectId })
        .session(session);

      if (result.deletedCount === 0) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      await Promise.all([
        this.accountService.deleteAccountsByUserIds([objectId], session),
        this.deviceService.revokeAllDevices([objectId], session),
      ]);

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      console.error(`Failed to delete user ${userId}: ${error.message}`);
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async deleteManyByAdmin(userIds: string[]) {
    if (!userIds || userIds.length === 0) {
      throw new BadRequestException("No user IDs provided");
    }

    const session = await this.userModel.db.startSession();
    session.startTransaction();
    try {
      const objectIds = userIds.map((id) => new Types.ObjectId(id));

      await this.userModel
        .deleteMany({ _id: { $in: objectIds } })
        .session(session);

      // Delete accounts sequentially
      await this.accountService.deleteAccountsByUserIds(objectIds, session);

      // Delete devices sequentially
      await this.deviceService.revokeAllDevices(objectIds, session);

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      console.error(`Bulk delete failed: ${error.message}`);
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async findAllDevices(userId: string) {
    return this.deviceService.getAllDevices(new Types.ObjectId(userId));
  }
}
