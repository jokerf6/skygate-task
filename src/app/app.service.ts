import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/globals/services/prisma.service';
@Injectable()
export class AppService {
  constructor(private prisma: PrismaService) { }
  getHello(): string {
    return 'Hello World!';
  }
}
