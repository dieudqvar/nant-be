import { IsEmail, IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'worker@example.com', description: 'User email' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', description: 'User password' })
  @IsString()
  password: string;

  @ApiProperty({ example: 'Linh Nanny', description: 'User full name' })
  @IsString()
  name: string;

  @ApiProperty({ example: '+84 98 765 4321', description: 'User phone number', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'WORKER', enum: ['ADMIN', 'WORKER', 'FAMILY', 'USER'], required: false })
  @IsOptional()
  @IsEnum(['ADMIN', 'WORKER', 'FAMILY', 'USER'])
  role?: 'ADMIN' | 'WORKER' | 'FAMILY' | 'USER';
}
