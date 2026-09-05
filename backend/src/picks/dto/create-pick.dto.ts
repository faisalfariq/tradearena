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
import { EntrySource, PickStatus } from '@prisma/client';

export class CreatePickDto {
  @ApiProperty({
    example: 'd3b07384-d113-4672-8f92-56de29d892d4',
    description: 'Participant ID',
  })
  @IsUUID('4', { message: 'ID Peserta harus berformat UUID v4' })
  @IsNotEmpty({ message: 'ID Peserta wajib diisi' })
  participantId: string;

  @ApiProperty({
    example: 'c2a07384-d113-4672-8f92-56de29d892d5',
    description: 'Stock ID',
  })
  @IsUUID('4', { message: 'ID Saham harus berformat UUID v4' })
  @IsNotEmpty({ message: 'ID Saham wajib diisi' })
  stockId: string;

  @ApiProperty({
    example: '2026-10-15',
    description: 'Trading date (YYYY-MM-DD)',
  })
  @IsDateString(
    {},
    { message: 'Format tanggal perdagangan tidak valid (gunakan YYYY-MM-DD)' },
  )
  @IsNotEmpty({ message: 'Tanggal perdagangan wajib diisi' })
  tradingDate: string;

  @ApiProperty({
    example: 9150,
    description: 'Entry price per share (harus > 0)',
  })
  @Type(() => Number)
  @IsNumber({}, { message: 'Harga entry harus berupa angka numerik' })
  @IsPositive({ message: 'Harga entry harus lebih besar dari 0' })
  entryPrice: number;

  @ApiPropertyOptional({
    example: '2026-10-15T09:00:00.000Z',
    description: 'Custom entry timestamp',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Format entry timestamp tidak valid' })
  entryTimestamp?: string;

  @ApiPropertyOptional({
    enum: EntrySource,
    default: EntrySource.MARKET_OPEN,
    description:
      'Entry price source (MARKET_OPEN, MANUAL_PRICE, CUSTOM_TIMESTAMP)',
  })
  @IsOptional()
  @IsEnum(EntrySource)
  entrySource?: EntrySource;

  @ApiPropertyOptional({
    enum: PickStatus,
    default: PickStatus.CONFIRMED,
    description: 'Pick status',
  })
  @IsOptional()
  @IsEnum(PickStatus)
  status?: PickStatus;
}
