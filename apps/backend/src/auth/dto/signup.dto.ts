import {
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
  Matches,
} from 'class-validator';

export class SignupDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @MinLength(2)
  companyName: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'companySlug deve conter apenas letras minúsculas, números e hífens',
  })
  companySlug?: string;

  @IsString()
  @MinLength(8)
  phone: string;

  @IsString()
  requestedPackageCode: string;
}
