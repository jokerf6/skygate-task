import { applyDecorators, BadRequestException } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';

export function RequiredFile() {
  return applyDecorators(
    ApiProperty({ type: String, format: 'binary', required: true }),
    ValidateImage(),
  );
}
export function OptionalFile() {
  return applyDecorators(
    ApiProperty({ type: String, format: 'binary', required: false }),
    ValidateImage(),
  );
}
export function RequiredFileOptional() {
  return applyDecorators(
    ApiProperty({ type: String, format: 'binary', required: false }),
    ValidateImage(),
  );
}
export function RequiredFileArray() {
  return applyDecorators(
    ApiProperty({ type: [String], format: 'binary', required: true }),
    ValidateImageArray(),
  );
}

export function ValidateImage() {
  return applyDecorators(
    Transform(({ value }) => {
      if (!value?.includes(env('INTERCEPTOR_KEY'))) return undefined;
      value = value?.replaceAll(env('INTERCEPTOR_KEY'), '');
      if (value !== '') return value.trim();
      return undefined;
    }),
    IsOptional(),
    IsString({
      message: (property) => {
        throw new BadRequestException(`validator.invalidFile`, {
          cause: { field: property.property },
        });
      },
    }),
  );
}

export function ValidateImageArray() {
  return applyDecorators(
    Transform(({ value }) => {
      if (Array.isArray(value)) value = value.map(String);
      if (typeof value === 'string') value = value.split(',').map(String);
      value = value
        ?.map((value) => {
          if (
            value !== '' &&
            value.trim() &&
            value?.includes(env('INTERCEPTOR_KEY'))
          )
            return value.replaceAll(env('INTERCEPTOR_KEY'), '');
        })
        ?.filter((x) => x !== undefined);
      if (value.length > 0) return value.replaceAll(env('INTERCEPTOR_KEY'));
      return undefined;
    }),
    IsString({
      each: true,
      message: (property) => {
        throw new BadRequestException(`validator.invalidFile`, {
          cause: { field: property.property },
        });
      },
    }),
  );
}
