import { RequiredFile } from 'src/_modules/media/decorators/upload.decorator';
import { ValidateEnum } from 'src/decorators/dto/enum.decorator';
import { Optional } from 'src/decorators/dto/optional-input.decorator';
import { Required } from 'src/decorators/dto/required-input.decorator';
import { ValidateString } from 'src/decorators/dto/validators/validate-string.decorator';
import { UploadTypes } from './upload.constants';

export class CreateUploadDTO {
  @Required()
  @ValidateString()
  filename: string;

  @Required()
  @ValidateEnum(UploadTypes, true)
  filetype: UploadTypes;

  @Optional()
  @ValidateString()
  folder?: string;
}

export class LocalUploadDTO {
  @RequiredFile()
  file: string;
}
