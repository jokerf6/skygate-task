import { applyDecorators, BadRequestException } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptions } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export function ValidateJson() {
  return applyDecorators(
    Transform(({ value, key }) => {
      let val;
      if (typeof value === 'object') return value;

      try {
        val = JSON.parse(value);
      } catch (_) {
        throw new BadRequestException(`errors.invalidStringifiedJson ${key}`, {
          cause: { field: key },
        });
      }

      return val;
    }),
  );
}

export function ValidateName(apiPropertyOptions?: ApiPropertyOptions) {
  return applyDecorators(
    ApiProperty({
      ...apiPropertyOptions,
      example: apiPropertyOptions?.example || '{"en": "John", "ar": "جون"}',
    }),
    Transform(({ value, key }) => {
      let val;
      if (typeof value === 'object') return value;

      try {
        val = JSON.parse(value);
      } catch (_) {
        throw new BadRequestException(`errors.invalidStringifiedJson ${key}`, {
          cause: { field: key },
        });
      }

      return val;
    }),
  );
}
