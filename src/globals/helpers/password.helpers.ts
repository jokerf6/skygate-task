import { UnprocessableEntityException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

export const validateUserPassword = (
  password: string,
  userPassword?: string,
) => {
  if (!userPassword) {
    throw new UnprocessableEntityException('Invalid credentials');
  }

  const isPasswordValid = bcrypt.compareSync(password, userPassword);

  if (!isPasswordValid) {
    throw new UnprocessableEntityException('Invalid credentials');
  }
};

// ----------------------------------------------------------------------------------------------

export const hashPassword = (password: string) => {
  const HashedPassword = bcrypt.hashSync(password, +env('HASH_SALT'));
  return HashedPassword;
};

// ----------------------------------------------------------------------------------------------
