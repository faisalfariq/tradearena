import { IsNotEmpty, IsString, IsOptional, IsEmail } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateParticipantDto {
  @ApiProperty({
    example: 'Budi Santoso',
    description: 'Full name or trading handle',
  })
  @IsString()
  @IsNotEmpty({ message: 'Nama peserta wajib diisi' })
  name: string;

  @ApiPropertyOptional({
    example: 'budi@example.com',
    description: 'Email address',
  })
  @IsOptional()
  @IsEmail({}, { message: 'Format email tidak valid' })
  email?: string;

  @ApiPropertyOptional({
    example: '+628123456789',
    description: 'Phone / WhatsApp number',
  })
  @IsOptional()
  @IsString()
  phoneNumber?: string;
}
