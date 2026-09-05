import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsDateString,
  IsEnum,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TournamentStatus } from '@prisma/client';
import { TournamentRuleDto } from './tournament-rule.dto';

export class CreateTournamentDto {
  @ApiProperty({
    example: 'Turnamen Saham Komunitas BSJP Musim 1',
    description: 'Tournament name',
  })
  @IsString()
  @IsNotEmpty({ message: 'Nama turnamen wajib diisi' })
  name: string;

  @ApiPropertyOptional({
    example: 'Turnamen stock picking harian dengan evaluasi otomatis IDX',
    description: 'Description',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: '2026-10-01T00:00:00.000Z',
    description: 'Start date',
  })
  @IsDateString(
    {},
    { message: 'Format tanggal mulai tidak valid (harus ISO date)' },
  )
  @IsNotEmpty({ message: 'Tanggal mulai wajib diisi' })
  startDate: string;

  @ApiProperty({ example: '2026-10-31T23:59:59.000Z', description: 'End date' })
  @IsDateString(
    {},
    { message: 'Format tanggal selesai tidak valid (harus ISO date)' },
  )
  @IsNotEmpty({ message: 'Tanggal selesai wajib diisi' })
  endDate: string;

  @ApiPropertyOptional({
    example: 'Asia/Jakarta',
    default: 'Asia/Jakarta',
    description: 'Tournament timezone',
  })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({
    enum: TournamentStatus,
    default: TournamentStatus.UPCOMING,
    description: 'Status',
  })
  @IsOptional()
  @IsEnum(TournamentStatus)
  status?: TournamentStatus;

  @ApiPropertyOptional({
    type: TournamentRuleDto,
    description: 'Tournament trading rules',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => TournamentRuleDto)
  rules?: TournamentRuleDto;
}
