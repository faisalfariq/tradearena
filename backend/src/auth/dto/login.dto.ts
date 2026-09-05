import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    example: 'admin@tradearena.local',
    description: 'Admin user email',
  })
  @IsEmail({}, { message: 'Format email tidak valid' })
  @IsNotEmpty({ message: 'Email tidak boleh kosong' })
  email: string;

  @ApiProperty({ example: 'AdminSecurePass123!', description: 'Password' })
  @IsString()
  @MinLength(6, { message: 'Password minimal 6 karakter' })
  @IsNotEmpty({ message: 'Password tidak boleh kosong' })
  password: string;
}
