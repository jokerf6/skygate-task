import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ClsService } from 'nestjs-cls';
import { AuditMiddleware } from 'prisma/middleware/prisma.audit.middleware';
import { ExistMiddleware } from 'prisma/middleware/prisma.exist.middleware';
import { softDeleteMiddleware } from 'prisma/middleware/prisma.softdelete.middleware';
import { sortMiddleware } from 'prisma/middleware/prisma.sort.middleware';



@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor(private readonly cls: ClsService) {
    super();
  }

  async onModuleInit() {
    try {
      await this.$connect();

      // Audit Middleware
      this.$use(AuditMiddleware(this, this.cls));
      this.$use(softDeleteMiddleware(this));
      this.$use(sortMiddleware());
      this.$use(ExistMiddleware(this));
    } catch (error) {
      console.error('Error connecting to database', error);
    }
  }
}
