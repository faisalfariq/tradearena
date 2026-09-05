import { IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EnrollParticipantDto {
  @ApiProperty({
    example: 'd3b07384-d113-4672-8f92-56de29d892d4',
    description: 'Participant ID to enroll into tournament',
  })
  @IsUUID('4', { message: 'ID Peserta harus berformat UUID v4' })
  @IsNotEmpty({ message: 'Participant ID wajib diisi' })
  participantId: string;
}
