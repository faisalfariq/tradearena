import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsOptional,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OverrideEvaluationDto {
  @ApiProperty({
    example: 10500,
    description: 'Harga exit penyesuaian (override)',
  })
  @IsNumber({}, { message: 'Harga exit harus berupa angka' })
  @Min(1, { message: 'Harga exit harus bernilai positif' })
  @IsNotEmpty({ message: 'Harga exit wajib diisi' })
  overrideExitPrice: number;

  @ApiPropertyOptional({
    example: 2.5,
    description:
      'Return persentase penyesuaian (jika tidak diisi akan dihitung otomatis dari entry)',
  })
  @IsOptional()
  @IsNumber({}, { message: 'Return harus berupa angka' })
  overrideReturn?: number;

  @ApiPropertyOptional({
    example: 2.5,
    description: 'Points penyesuaian (jika tidak diisi akan mengikuti return)',
  })
  @IsOptional()
  @IsNumber({}, { message: 'Points harus berupa angka' })
  overridePoints?: number;

  @ApiProperty({
    example:
      'Koreksi manual karena pembatalan transaksi bursa pada candle penutupan',
    description: 'Alasan penyesuaian manual (wajib dicatat untuk audit trail)',
  })
  @IsString({ message: 'Alasan harus berupa string' })
  @IsNotEmpty({ message: 'Alasan penyesuaian wajib diisi' })
  reason: string;
}
