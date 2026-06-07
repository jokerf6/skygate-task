import { Injectable } from '@nestjs/common';

@Injectable()
export class EmailService {
  constructor() {}
  async sendEmail(email: string, message: string) {
    // eslint-disable-next-line no-console
    console.log(`Sending Email to ${email} with message: ${message}`);
  }
}
