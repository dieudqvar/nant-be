import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class GoogleCallbackDto {
  @ApiProperty({
    description: 'Google ID token from OAuth flow',
    example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6Ij...',
  })
  @IsString()
  idToken: string;

  @ApiPropertyOptional({
    enum: Role,
    description: 'Optional role for first-time user. Defaults to WORKER',
    example: Role.WORKER,
  })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
