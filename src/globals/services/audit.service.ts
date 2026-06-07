import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from './prisma.service';
import { getAuditArgs } from 'src/app/_modules/audit/prisma-args/audit.prisma.args';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async logAction(data: {
    action: string;
    entityName?: string;
    entityId?: string;
    entityLabel?: string;
    userId?: string;
    metadata?: any;
    ip?: string;
    userAgent?: string;
  }) {
    await this.prisma.auditLog.create({
      data: {
        entityName: data.entityName || 'SYSTEM',
        entityId: data.entityId || '0',
        entityLabel: data.entityLabel,
        action: data.action,
        userId: data.userId,
        metadata: data.metadata || undefined,
        ip: data.ip,
        userAgent: data.userAgent,
      },
    });
  }

  async createAuditLog(data: {
    entityName: string;
    entityId: string;
    entityLabel?: string;
    action: string;
    userId?: string;
    originalValues?: any;
    newValues?: any;
    ip?: string;
    userAgent?: string;
    metadata?: any;
  }) {
    await this.prisma.auditLog.create({
      data: {
        entityName: data.entityName,
        entityId: data.entityId,
        entityLabel: data.entityLabel,
        action: data.action,
        userId: data.userId,
        originalValues: data.originalValues ?? undefined,
        newValues: data.newValues ?? undefined,
        ip: data.ip,
        userAgent: data.userAgent,
        metadata: data.metadata ?? undefined,
      },
    });
  }
  async getHistory(filters: any) {
    const args = getAuditArgs(filters);
    const data = await this.prisma.auditLog.findMany({
      ...args,
      orderBy: { createdAt: 'desc' },
    });
    const total = await this.prisma.auditLog.count({ where: args.where });
    return { data, total };
  }

  async getLog(id: number) {
    return await this.prisma.auditLog.findUnique({
      where: { id },
    });
  }

  getTrackedEntities() {
    const excludedModels = ['AuditLog', 'OTP', 'Session'];
    const allModels = Prisma.ModelName ? Object.values(Prisma.ModelName) : [];
    return allModels.filter(model => !excludedModels.includes(model));
  }
}
