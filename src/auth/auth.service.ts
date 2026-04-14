import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { Role, User, WorkerDocumentType } from '@prisma/client';
import { compare, hash } from 'bcrypt';
import { randomUUID } from 'crypto';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { MailService } from './mail.service';

type GoogleTokenInfo = {
  aud?: string;
  email?: string;
  email_verified?: string;
  name?: string;
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private mailService: MailService,
  ) {}

  async register(createUserDto: CreateUserDto) {
    const { email, password, name, phone, role } = createUserDto;
    const safeRole: Role =
      role === Role.ADMIN || role === Role.FAMILY || role === Role.WORKER
        ? role
        : Role.WORKER;

    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      this.logger.warn(`Register failed: existing email ${email}`);
      throw new ConflictException('User already exists');
    }

    // Hash password
    const hashedPassword = await hash(password, 10);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email,
        name,
        phone,
        role: safeRole,
        password: hashedPassword,
      },
    });

    // Generate JWT token
    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async createDefaultAdmin(): Promise<User> {
    const defaultAdminEmail = 'admin@gmail.com';
    const defaultAdminPassword = 'Admin@123';

    const existingAdmin = await this.prisma.user.findUnique({
      where: { email: defaultAdminEmail },
    });

    if (existingAdmin) {
      return existingAdmin;
    }

    const hashedPassword = await hash(defaultAdminPassword, 10);

    return this.prisma.user.create({
      data: {
        email: defaultAdminEmail,
        password: hashedPassword,
        name: 'System Admin',
        role: Role.ADMIN,
      },
    });
  }

  async login(email: string, password: string) {
    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      this.logger.warn(`Login failed: user not found for email ${email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check password
    const isPasswordValid = await compare(password, user.password);

    if (!isPasswordValid) {
      this.logger.warn(`Login failed: invalid password for email ${email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate JWT token
    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async loginWithGoogleIdToken(idToken: string, role?: Role) {
    const tokenInfo = await this.verifyGoogleIdToken(idToken);

    const email = tokenInfo.email;
    if (!email) {
      throw new UnauthorizedException('Google token does not contain email');
    }

    const safeRole: Role =
      role === Role.FAMILY || role === Role.WORKER ? role : Role.WORKER;

    let user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email,
          name: tokenInfo.name?.trim() || email.split('@')[0] || 'Google User',
          role: safeRole,
          // Local password is still required by schema even for OAuth-created users.
          password: await hash(randomUUID(), 10),
        },
      });
    }

    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async validateUser(id: number | undefined) {
    if (!id || !Number.isInteger(id)) {
      throw new UnauthorizedException('Invalid token payload');
    }

    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        worker: {
          include: {
            documents: {
              where: { type: WorkerDocumentType.PROFILE_PHOTO },
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: {
                id: true,
                fileUrl: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const { password: _password, ...safeUser } = user;
    const profilePhotoUrl = user.worker?.documents?.[0]?.fileUrl ?? null;

    return {
      ...safeUser,
      worker: user.worker
        ? {
            ...user.worker,
            profilePhotoUrl,
          }
        : null,
    };
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { email } });

    // Always return the same message to avoid email enumeration
    if (!user) {
      return { message: 'If that email exists, a reset link has been sent.' };
    }

    // Sign a short-lived token using a secret derived from the user's current password hash
    // — the token becomes invalid automatically once the password is changed.
    const secret =
      this.configService.get<string>('JWT_SECRET')! + user.password;
    const token = this.jwtService.sign(
      { sub: user.id, email: user.email },
      { secret, expiresIn: '15m' },
    );

    const appUrl =
      this.configService.get<string>('APP_URL') ?? 'http://localhost:3000';
    const resetLink = `${appUrl}/reset-password?token=${token}`;

    // Fire-and-forget: don't block the HTTP response on SMTP
    this.mailService.sendPasswordResetEmail(email, resetLink).catch((err) => {
      this.logger.error(
        `Failed to send reset email to ${email}: ${String(err)}`,
      );
    });

    return { message: 'If that email exists, a reset link has been sent.' };
  }

  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    // Decode without verifying first to get the user id
    let payload: { sub: number; email: string };
    try {
      payload = this.jwtService.decode(token);
    } catch {
      throw new BadRequestException('Invalid token');
    }

    if (!payload?.sub) {
      throw new BadRequestException('Invalid token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify the token using the secret derived from the current password hash
    const secret =
      this.configService.get<string>('JWT_SECRET')! + user.password;
    try {
      this.jwtService.verify(token, { secret });
    } catch {
      throw new BadRequestException('Reset link is invalid or has expired');
    }

    const hashedPassword = await hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    return { message: 'Password has been reset successfully.' };
  }

  private async verifyGoogleIdToken(idToken: string): Promise<GoogleTokenInfo> {
    const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`;
    const response = await fetch(url);

    if (!response.ok) {
      this.logger.warn(
        'Google token verification failed with non-200 response',
      );
      throw new UnauthorizedException('Invalid Google token');
    }

    const payload = (await response.json()) as GoogleTokenInfo;
    if (payload.email_verified !== 'true') {
      throw new UnauthorizedException('Google email is not verified');
    }

    const expectedClientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    if (expectedClientId && payload.aud !== expectedClientId) {
      throw new UnauthorizedException('Google token audience mismatch');
    }

    return payload;
  }
}
