import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './schemas/user.schema';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
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
    return this.userModel.findByIdAndUpdate(
      userId,
      { isVerified: true },
      { new: true },
    );
  }

  async findById(userId: string) {
    return this.userModel.findById(userId);
  }

  async updateProfile(userId: string, update: UpdateUserDto) {
    return this.userModel.findByIdAndUpdate(userId, update, { new: true });
  }
}
