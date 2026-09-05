import {
  IsNumber,
  IsEnum,
  IsOptional,
  IsString,
  Min,
  Max,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CandleAmbiguityPolicy, GapPolicy } from '@prisma/client';
import { Type } from 'class-transformer';

export class TournamentRuleDto {
  @ApiPropertyOptional({
    description:
      'Initial Cut Loss minimum percentage threshold (e.g. 0.03 for -3%)',
    example: 0.03,
    default: 0.03,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.005)
  @Max(0.5)
  initialStopPct?: number;

  @ApiPropertyOptional({
    description:
      'Trailing Stop percentage from highest valid peak (e.g. 0.03 for 3%)',
    example: 0.03,
    default: 0.03,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.005)
  @Max(0.5)
  trailingStopPct?: number;

  @ApiPropertyOptional({
    enum: CandleAmbiguityPolicy,
    default: CandleAmbiguityPolicy.CONSERVATIVE_LOSS_FIRST,
    description: 'Policy when candle high/low sequence is ambiguous',
  })
  @IsOptional()
  @IsEnum(CandleAmbiguityPolicy)
  candleAmbiguityPolicy?: CandleAmbiguityPolicy;

  @ApiPropertyOptional({
    enum: GapPolicy,
    default: GapPolicy.ACTUAL_FIRST_VALID_LEVEL,
    description: 'Execution policy when gap skips theoretical stop threshold',
  })
  @IsOptional()
  @IsEnum(GapPolicy)
  gapPolicy?: GapPolicy;

  @ApiPropertyOptional({
    example: 'IDX_STANDARD_V1',
    default: 'IDX_STANDARD_V1',
    description: 'Price fraction / tick size policy identifier',
  })
  @IsOptional()
  @IsString()
  priceFractionPolicy?: string;

  @ApiPropertyOptional({
    example: 'PERCENTAGE_RETURN_V1',
    default: 'PERCENTAGE_RETURN_V1',
    description: 'Points calculation rule identifier',
  })
  @IsOptional()
  @IsString()
  pointsRule?: string;

  @ApiPropertyOptional({
    example: 'v1.0.0',
    default: 'v1.0.0',
    description: 'Calculation engine version code',
  })
  @IsOptional()
  @IsString()
  calculationRuleVersion?: string;
}
