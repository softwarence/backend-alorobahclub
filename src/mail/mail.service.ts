import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  async sendVerificationEmail(email: string, token: string) {
    const baseUrl =
      this.configService.get<string>('BASE_URL') || 'http://localhost:3000';
    const url = `${baseUrl}/auth/verify-email?token=${token}`;

    await this.mailerService.sendMail({
      to: email,
      subject: 'Verify your Al-Orobah Account',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Welcome to our Store!</h2>
          <p>Please click the button below to verify your email and continue to shopping:</p>
          <a href="${url}" 
             style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
             Verify My Email
          </a>
          <p>If the button doesn't work, copy and paste this link: <br> ${url}</p>
        </div>
      `,
    });
  }
}
