import {
  IsOptional,
  IsNumber,
  IsPositive,
  IsDateString,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { EntrySource, PickStatus } from '@prisma/client';

export class UpdatePickDto {
  @ApiPropertyOptional({
    example: 9200,
    description: 'Updated entry price',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Harga entry harus berupa angka numerik' })
  @IsPositive({ message: 'Harga entry harus lebih besar dari 0' })
  entryPrice?: number;

  @ApiPropertyOptional({
    example: '2026-10-15T09:05:00.000Z',
    description: 'Updated entry timestamp',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Format entry timestamp tidak valid' })
  entryTimestamp?: string;

  @ApiPropertyOptional({
    enum: EntrySource,
    description: 'Updated entry source',
  })
  @IsOptional()
  @IsEnum(EntrySource)
  entrySource?: EntrySource;

  @ApiPropertyOptional({
    enum: PickStatus,
    description: 'Updated pick status',
  })
  @IsOptional()
  @IsEnum(PickStatus)
  status?: PickStatus;
}
