import { applyDecorators } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDate } from 'class-validator';

export function ValidateDate() {
  return applyDecorators(
    ApiProperty({ type: Date, example: new Date() }),
    Transform(({ value }) => {
      return new Date(value);
    }),
    IsDate(),
  );
}
