import { applyDecorators } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptions } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export function ValidatePhone(apiPropertyOptions?: ApiPropertyOptions) {
  return applyDecorators(
    ApiProperty({
      ...apiPropertyOptions,
      example: apiPropertyOptions?.example || '+966 0509999999',
      // example: apiPropertyOptions?.example || '+20 1092725145',
    }),
    IsString(),
    Matches(/^\+966\s?(5|05)\d{8}$/, {
      message: 'enter valid phone',
    }),
    // Matches(/^\+?[\d\s-]{7,20}$/, {
    //   message: 'enter valid phone like this +966 0509999999 || +20 1092725145',
    // }),

    // Matches(/^(\+974|974|0)?[3567]\d{7}$/, {
    //   message: 'enter valid phone like this +974 44335566',
    // }),
  );
}
