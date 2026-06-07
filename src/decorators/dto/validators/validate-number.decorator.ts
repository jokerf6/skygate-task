import { applyDecorators, BadRequestException } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsNumber } from 'class-validator';

export function ValidateNumber(
  options: { allowNegative?: boolean } = { allowNegative: false },
) {
  return applyDecorators(
    Transform(({ value }) => {
      const num = +value;
      if (options.allowNegative === false && num < 0) {
        throw new BadRequestException('Negative numbers are not allowed');
      }
      return num;
    }),
    IsNumber(),
  );
}

export function ValidateNumberArray(
  options: { allowNegative?: boolean } = { allowNegative: false },
) {
  return applyDecorators(
    Transform(({ value, key }) => {
      let numbers: number[];

      if (Array.isArray(value)) {
        numbers = value.map(Number);
      } else if (typeof value === 'string') {
        numbers = value.split(',').map(Number);
      } else {
        throw new BadRequestException(`Invalid number array in ${key}`);
      }

      if (options.allowNegative === false && numbers.some((n) => n < 0)) {
        throw new BadRequestException(
          'Negative numbers are not allowed in array',
        );
      }

      return numbers;
    }),
    IsNumber({}, { each: true }),
  );
}
