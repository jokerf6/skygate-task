import { Body, Controller, Post, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { Auth } from 'src/_modules/authentication/decorators/auth.decorator';
import { tag } from 'src/globals/helpers/tag.helper';
import { ResponseService } from 'src/globals/services/response.service';
import { CustomerCreateService } from '../services/customer.create.service';
import { CreateCustomerDTO } from '../dto/create.customer.dto';
import { OTPService } from 'src/_modules/authentication/services/otp.service';
import { OTPType, SessionType } from '@prisma/client';
import { CurrentUser } from 'src/_modules/authentication/decorators/current-user.decorator';
import { TokenService } from 'src/_modules/authentication/services/jwt.service';
import { IpAddress } from 'src/_modules/authentication/decorators/ip.decorator';
import { AdminEndpoint, CustomerEndpoint } from 'src/decorators/api/api-scope.decorator';
import { CurrentLocale } from 'src/_modules/authentication/decorators/currentLocale.decorator';

const prefix = 'customers';
@Controller(["auth",prefix])
@ApiTags(tag("auth"))
export class CustomerCreateController {
  constructor(
    private readonly service: CustomerCreateService,
    private readonly OTPService: OTPService,
    private responses: ResponseService,
    private readonly tokenService: TokenService,
  ) {}

  @CustomerEndpoint(undefined, true)
   @AdminEndpoint("customers/create", true, SessionType.ACCESS)
  @Post(["register","create"])
  @ApiOperation({
    description: 'Create a new customer with permission or register customer',
  })
  async createUser(
    @IpAddress() ip: string,
    @Res() res: Response, 
    @Body() dto: CreateCustomerDTO,
    @CurrentUser() currentUser: CurrentUser,
    @CurrentLocale() locale: string,
  ) {
    const user = await this.service.create(dto);
    await this.OTPService.generateOTP(user.id, OTPType.EMAIL_VERIFICATION);
    const {token} = !currentUser
      ? await this.tokenService.generateToken(
          user.id,
          ip,
          undefined,
          undefined,
          SessionType.VERIFY,
          locale
        )
      : undefined;
    return this.responses.success(res, 'customer created successfully', {
      user,
      token,
    });
  }
}
