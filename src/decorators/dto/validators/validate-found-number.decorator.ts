import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import {
  isArray,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

function getPrismaModelName(name: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith('s')) return lower.slice(0, -1);
  return lower;
}

@ValidatorConstraint({ async: true })
@Injectable()
export class ExistsInDatabaseConstraint implements ValidatorConstraintInterface {
  private prisma = new PrismaClient();

  async validate(value: any, args: ValidationArguments): Promise<boolean> {
    const rawModel: string =
      args.constraints?.at(0) || args.property.slice(0, -2);
    const extraConditions = args.constraints?.at(1);
    const validateArrayExistence = args.constraints?.at(2);
    const whereConfig = args.constraints?.at(3);

    const model = getPrismaModelName(rawModel);

    if (
      value === undefined ||
      value === null ||
      (isArray(value) && value.length === 0)
    ) {
      return true;
    }

    let whereClause: any = {};

    try {
      await this.prisma.$connect();

      if (whereConfig) {
        for (const [k, v] of Object.entries(whereConfig)) {
          if (v === true) {
            whereClause[k] = isArray(value) ? { in: value } : value;
          } else {
            whereClause[k] = v;
          }
        }
      } else {
        whereClause.id = isArray(value) ? { in: value } : value;
      }

      if (extraConditions) {
        whereClause = { ...whereClause, ...extraConditions };
      }

      whereClause.deletedAt = null;

      if (validateArrayExistence && isArray(value)) {
        const exist = await this.prisma[model].findMany({
          where: whereClause,
        });

        const matchField = whereConfig
          ? Object.keys(whereConfig).find((k) => whereConfig[k] === true) ||
            'id'
          : 'id';

        const existingValues = exist.map((record) => record[matchField]);
        const nonExistentValues = value.filter(
          (val) => !existingValues.includes(val),
        );

        if (nonExistentValues.length) {
          throw new BadRequestException(`*[${nonExistentValues}]* 0EXIST0`);
        }
        return true;
      }

      let exist;
      try {
        exist = await this.prisma[model].findUnique({
          where: whereClause,
        });
      } catch {
        exist = await this.prisma[model].findFirst({
          where: whereClause,
        });
      }

      return !!exist;
    } catch (e) {
      if (
        e.message?.includes('deletedAt') ||
        e.code === 'P2025' ||
        e.message?.includes('Unknown field')
      ) {
        try {
          const { deletedAt, ...whereWithoutDeleted } = whereClause;
          let exist;
          try {
            exist = await this.prisma[model].findUnique({
              where: whereWithoutDeleted,
            });
          } catch {
            exist = await this.prisma[model].findFirst({
              where: whereWithoutDeleted,
            });
          }
          return !!exist;
        } catch (innerErr) {
          throw innerErr;
        }
      }
      throw e;
    } finally {
      await this.prisma.$disconnect();
    }
  }

  defaultMessage(args: ValidationArguments) {
    const value = args.value;
    return `0EXIST0 *${value}*`;
  }
}

import { registerDecorator, ValidationOptions } from 'class-validator';

export function ValidateExist<
  ModelName extends keyof PrismaClient | (string & {}) = keyof PrismaClient,
  WhereInput = any,
>(
  validation?: {
    model?: ModelName;
    isArray?: boolean;
    where?: Record<string, any>;
    extraConditions?: WhereInput;
  },
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [
        validation?.model,
        validation?.extraConditions,
        validation?.isArray,
        validation?.where,
      ],
      validator: ExistsInDatabaseConstraint,
    });
  };
}
