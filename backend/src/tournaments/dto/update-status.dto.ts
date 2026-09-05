import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TournamentStatus } from '@prisma/client';

export class UpdateTournamentStatusDto {
  @ApiProperty({ enum: TournamentStatus, example: TournamentStatus.ACTIVE })
  @IsEnum(TournamentStatus)
  @IsNotEmpty({ message: 'Status turnamen wajib diisi' })
  status: TournamentStatus;
}
