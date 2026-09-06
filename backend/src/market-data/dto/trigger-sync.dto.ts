import {
  IsNotEmpty,
  IsDateString,
  IsOptional,
  IsBoolean,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TriggerSyncDto {
  @ApiProperty({
    example: '2026-09-05',
    description: 'Tanggal perdagangan (YYYY-MM-DD) yang akan disinkronkan',
  })
  @IsDateString(
    {},
    { message: 'Format tanggal perdagangan tidak valid (harus YYYY-MM-DD)' },
  )
  @IsNotEmpty({ message: 'Tanggal perdagangan wajib diisi' })
  tradingDate: string;

  @ApiPropertyOptional({
    example: 'mock',
    default: 'mock',
    description: 'Nama provider market data (mock atau http)',
  })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiPropertyOptional({
    example: false,
    default: false,
    description: 'Paksa unduh ulang data meskipun sudah ada di database',
  })
  @IsOptional()
  @IsBoolean()
  forceRefetch?: boolean;
}
