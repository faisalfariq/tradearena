import { IsNotEmpty, IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateStockDto {
  @ApiProperty({ example: 'BBCA', description: 'Stock ticker / symbol' })
  @IsString()
  @IsNotEmpty({ message: 'Ticker saham wajib diisi' })
  symbol: string;

  @ApiProperty({
    example: 'Bank Central Asia Tbk',
    description: 'Company name',
  })
  @IsString()
  @IsNotEmpty({ message: 'Nama perusahaan emiten wajib diisi' })
  name: string;

  @ApiPropertyOptional({
    example: 'IDX',
    default: 'IDX',
    description: 'Stock exchange',
  })
  @IsOptional()
  @IsString()
  exchange?: string;

  @ApiPropertyOptional({
    example: true,
    default: true,
    description: 'Active status',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
