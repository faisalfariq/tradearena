import {
  IsNotEmpty,
  IsUUID,
  IsDateString,
  IsNumber,
  IsPositive,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EntrySource } from '@prisma/client';

export class SubmitMyPickDto {
  @ApiProperty({
    example: 'c2a07384-d113-4672-8f92-56de29d892d5',
    description: 'Stock ID yang dipilih (Emiten IDX)',
  })
  @IsUUID('4', { message: 'ID Saham harus berformat UUID v4' })
  @IsNotEmpty({ message: 'ID Saham wajib diisi' })
  stockId: string;

  @ApiPropertyOptional({
    example: '2026-10-15',
    description: 'Tanggal perdagangan (YYYY-MM-DD), default: hari ini',
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'Format tanggal perdagangan tidak valid (gunakan YYYY-MM-DD)' },
  )
  tradingDate?: string;

  @ApiPropertyOptional({
    example: 9150,
    description: 'Estimasi harga entry per lembar (opsional, default: harga buka / 1000)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Harga entry harus berupa angka numerik' })
  @IsPositive({ message: 'Harga entry harus lebih besar dari 0' })
  entryPrice?: number;

  @ApiPropertyOptional({
    enum: EntrySource,
    default: EntrySource.MARKET_OPEN,
    description: 'Sumber harga entry',
  })
  @IsOptional()
  @IsEnum(EntrySource, { message: 'Sumber harga entry tidak valid' })
  entrySource?: EntrySource;
}
