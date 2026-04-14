import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: this.configService.get<number>('SMTP_PORT') ?? 587,
      secure: this.configService.get<string>('SMTP_SECURE') === 'true',
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });
  }

  async sendPasswordResetEmail(email: string, resetLink: string): Promise<void> {
    const from = this.configService.get<string>('SMTP_FROM') ?? 'no-reply@nannymatch.com';

    await this.transporter.sendMail({
      from,
      to: email,
      subject: 'Reset your password — NannyMatch',
      html: `
        <p>You requested a password reset.</p>
        <p>Click the link below to set a new password. This link expires in <strong>15 minutes</strong>.</p>
        <p><a href="${resetLink}">${resetLink}</a></p>
        <p>If you did not request this, please ignore this email.</p>
      `,
    });

    this.logger.log(`Password reset email sent to ${email}`);
  }
}
