import { ClsService } from 'nestjs-cls';
import { Prisma, PrismaClient } from '@prisma/client';

export function AuditMiddleware(prisma: PrismaClient, cls: ClsService): Prisma.Middleware {
  return async (params, next) => {
    const { model, action, args } = params;

    if (model === 'AuditLog' || !model || ['OTP', 'Session'].includes(model)) {
      return next(params);
    }

    const user = cls.get('user');
    const userId = user?.id?.toString() || user?.userId?.toString();
    const req = cls.get('req');

    const ip = req?.ip || req?.headers?.['x-forwarded-for'] || null;
    const userAgent = req?.headers?.['user-agent'] || null;

    let originalValues = null;

    if (['update', 'delete', 'updateMany', 'deleteMany'].includes(action)) {
      try {
        if (args?.where) {
          if (action === 'update' || action === 'delete') {
            originalValues = await (prisma[model as any] as any).findUnique({
              where: args.where,
            });
          }
        }
      } catch (e) {
        console.error(`Audit Snapshot Error [${model}.${action}]`, e);
      }
    }

    const result = await next(params);

    try {
      if (['create', 'update', 'delete'].includes(action)) {
        const entityId = result?.id?.toString() || args?.where?.id?.toString() || '?';
        const entityLabel = result?.name || result?.title || result?.username || null;

        await prisma.auditLog.create({
          data: {
            entityName: model,
            entityId,
            entityLabel: entityLabel ? String(entityLabel) : null,
            action: action.toUpperCase(),
            userId: userId,
            ip,
            userAgent,
            originalValues: originalValues || undefined,
            newValues: action === 'delete' ? null : result,
          },
        });
      }
    } catch (e) {
      console.error(`Audit Logging Error [${model}.${action}]`, e);
    }
    return result;
  };
}
