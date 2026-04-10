import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { Role, User } from '@prisma/client';
import { compare, hash } from 'bcrypt';
import { CreateUserDto } from '../users/dto/create-user.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
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

  async validateUser(id: number | undefined) {
    if (!id || !Number.isInteger(id)) {
      throw new UnauthorizedException('Invalid token payload');
    }

    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }
}
