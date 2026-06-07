import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class EmailDTO {
  @ApiProperty({ example: 'fahd.test@gmail.com' })
  @IsEmail()
  email: string;
}
