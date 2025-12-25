import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { ConfigModule, ConfigService } from "@nestjs/config";

import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { JwtStrategy } from "./strategies/jwt.strategy";

import { User, UserSchema } from "../users/schemas/user.schema";
import { Account, AccountSchema } from "../accounts/schemas/account.schema";
import { Device, DeviceSchema } from "../devices/schemas/device.schema";

import { UsersModule } from "../users/users.module";
import { VerificationsModule } from "../verifications/verifications.module";
import { MailModule } from "../mail/mail.module";
import { AccountsModule } from "../accounts/accounts.module";
import { DevicesModule } from "../devices/devices.module";

@Module({
  imports: [
    ConfigModule,
    AccountsModule,
    DevicesModule,
    PassportModule.register({ defaultStrategy: "jwt" }),

    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>("JWT_ACCESS_SECRET"),
        signOptions: {
          expiresIn: Number(
            config.get<string>("ACCESS_TOKEN_EXPIRES") || "15m"
          ),
        },
      }),
    }),

    UsersModule,
    VerificationsModule,
    MailModule,

    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Account.name, schema: AccountSchema },
      { name: Device.name, schema: DeviceSchema },
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [PassportModule, JwtModule],
})
export class AuthModule {}
