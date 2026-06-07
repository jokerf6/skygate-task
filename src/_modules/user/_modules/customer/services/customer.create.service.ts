import { ConflictException, Injectable } from '@nestjs/common';
import { hashPassword } from 'src/globals/helpers/password.helpers';
import { PrismaService } from 'src/globals/services/prisma.service';
import { CreateCustomerDTO } from '../dto/create.customer.dto';
import { RolesKeys } from 'src/_modules/authorization/providers/roles';

@Injectable()
export class CustomerCreateService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateCustomerDTO) {

    const existingCustomer = await this.prisma.user.findUnique({
      where: {
       email:data.email,
      },
      select: {
        email: true,
        phone: true,
        id: true,
        name: true,
        verified: true,
        roleKey:true,
      },

      __includeDeleted: true as never,
    });
    if(existingCustomer && existingCustomer.roleKey !== RolesKeys.CUSTOMER){
      throw new ConflictException('user with this email already exists');
    }
    
    if (existingCustomer && existingCustomer.verified)
      throw new ConflictException('user already exists'); 

    const hashedPassword = hashPassword(data.password);
    data.password = hashedPassword;
    if(existingCustomer && existingCustomer.email !== data.email){
      await this.prisma.user.update({
        where: { id: existingCustomer.id },
        data: { email: data.email, name: data.name },
      });
      return existingCustomer;
    }
    const response =
      existingCustomer && !existingCustomer.verified
        ? existingCustomer
        : await this.prisma.user.create({
            data: {
              ...data,
              roleKey: RolesKeys.CUSTOMER,
             
            },
            select: { email: true, phone: true, id: true, name: true },
          });

    if (existingCustomer?.verified) delete existingCustomer.verified;
    return response;
  }
}
