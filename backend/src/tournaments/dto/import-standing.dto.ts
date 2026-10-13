import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateTournamentDto } from './create-tournament.dto';

export class ImportStandingItemDto {
  @ApiProperty({
    example: 'Budi Santoso',
    description: 'Nama peserta turnamen',
  })
  @IsString()
  @IsNotEmpty({ message: 'Nama peserta wajib diisi' })
  name: string;

  @ApiPropertyOptional({
    example: 'budi@example.com',
    description: 'Email peserta (opsional, untuk linking akun)',
  })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({
    example: 25.4,
    description: 'Akumulasi total poin saat ini dari pencatatan manual',
  })
  @IsNumber({}, { message: 'Total poin harus berupa angka valid' })
  totalPoints: number;

  @ApiPropertyOptional({
    example: 8,
    default: 0,
    description: 'Jumlah trade menang (win count)',
  })
  @IsOptional()
  @IsNumber()
  winCount?: number;

  @ApiPropertyOptional({
    example: 2,
    default: 0,
    description: 'Jumlah trade kalah (loss count)',
  })
  @IsOptional()
  @IsNumber()
  lossCount?: number;

  @ApiPropertyOptional({
    example: 1,
    default: 0,
    description: 'Jumlah trade seri/impas (breakeven count)',
  })
  @IsOptional()
  @IsNumber()
  breakevenCount?: number;

  @ApiPropertyOptional({
    example: 11,
    description: 'Total pick / transaksi sebelum import',
  })
  @IsOptional()
  @IsNumber()
  picksCount?: number;

  @ApiPropertyOptional({
    example: 0,
    default: 0,
    description: 'Berapa kali peserta melanggar tidak melakukan pick harian',
  })
  @IsOptional()
  @IsNumber()
  penaltiesCount?: number;

  @ApiPropertyOptional({
    example: 0,
    default: 0,
    description: 'Total akumulasi poin penalti yang sudah didapat (angka negatif/nol)',
  })
  @IsOptional()
  @IsNumber()
  penaltyPoints?: number;
}

export class CreateTournamentWithImportDto extends CreateTournamentDto {
  @ApiProperty({
    type: [ImportStandingItemDto],
    description: 'Daftar data klasemen terakhir yang diimport dari manual tracking',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportStandingItemDto)
  standings: ImportStandingItemDto[];
}

export class ImportStandingsDto {
  @ApiProperty({
    type: [ImportStandingItemDto],
    description: 'Daftar data klasemen untuk diimport ke turnamen',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportStandingItemDto)
  standings: ImportStandingItemDto[];
}
