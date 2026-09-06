import { IsNotEmpty, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EvaluateTournamentDayDto {
  @ApiProperty({
    example: '2026-09-05',
    description: 'Tanggal perdagangan (YYYY-MM-DD) yang akan dievaluasi',
  })
  @IsDateString(
    {},
    { message: 'Format tanggal perdagangan tidak valid (harus YYYY-MM-DD)' },
  )
  @IsNotEmpty({ message: 'Tanggal perdagangan wajib diisi' })
  tradingDate: string;
}
