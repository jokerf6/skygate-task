import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  async sendEmail(email: string, message: string) {
    this.logger.log(`Sending Email to ${email} with message: ${message}`);
  }
}
