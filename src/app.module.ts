import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { MongooseModule } from "@nestjs/mongoose";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { MailerModule } from "@nestjs-modules/mailer";
import { AccountsModule } from "./accounts/accounts.module";
import { DevicesModule } from "./devices/devices.module";
import { VerificationsModule } from "./verifications/verifications.module";
import { MailModule } from "./mail/mail.module";
import { CategoriesModule } from "./categories/categories.module";
import { ProductsModule } from "./products/products.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>("DB_CONNECTION_URI"),
      }),
    }),
    MailerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        transport: {
          host: config.get<string>("MAIL_HOST"),
          port: Number(config.get<string>("MAIL_PORT")),
          secure: true,
          auth: {
            user: config.get<string>("MAIL_USER"),
            pass: config.get<string>("MAIL_PASS"),
          },
        },
        defaults: {
          from: '"No Reply" <noreply@alorobah.sa>',
        },
      }),
    }),
    AuthModule,
    UsersModule,
    AccountsModule,
    DevicesModule,
    VerificationsModule,
    MailModule,
    CategoriesModule,
    CategoriesModule,
    ProductsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
