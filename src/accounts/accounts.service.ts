import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { ClientSession, Model, Types } from "mongoose";
import { Account } from "./schemas/account.schema";

@Injectable()
export class AccountService {
  constructor(
    @InjectModel(Account.name) private accountModel: Model<Account>
  ) {}

  async createAccount(
    userId: string,
    providerId: string,
    email: string,
    passwordHash: string
  ) {
    return this.accountModel.create({
      userId: new Types.ObjectId(userId),
      provider: providerId,
      providerAccountId: email,
      password: passwordHash,
    });
  }

  async getAccounts(userId: string) {
    return this.accountModel.find({ userId });
  }

  async findByEmail(email: string) {
    return this.accountModel.findOne({ providerAccountId: email });
  }

  async findByUserId(userId: string) {
    return this.accountModel.findOne({
      userId,
      provider: "credentials",
    });
  }

  async deleteAccountsByUserIds(
    userIds: Types.ObjectId[],
    session: ClientSession
  ) {
    return this.accountModel.deleteMany(
      { userId: { $in: userIds } },
      { session }
    );
  }

  async updatePassword(accountId: string, newPasswordHash: string) {
    const account = await this.accountModel.findById(accountId);
    if (!account) throw new NotFoundException("Account not found");

    account.password = newPasswordHash;
    return account.save();
  }
}
