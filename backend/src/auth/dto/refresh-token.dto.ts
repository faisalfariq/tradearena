import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty({ description: 'JWT Refresh Token string' })
  @IsString()
  @IsNotEmpty({ message: 'Refresh token tidak boleh kosong' })
  refreshToken: string;
}
