import {
  IsString,
  IsEmail,
  MinLength,
  IsDateString,
  Length,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RegisterDto {
  @IsString()
  @Type(() => String)
  name: string;

  @IsEmail()
  @Type(() => String)
  email: string;

  @IsString()
  @Type(() => String)
  phone: string;

  @IsDateString()
  @Length(9, 15)
  @Type(() => String)
  dateOfBirth: string;

  @IsString()
  @MinLength(8)
  @Type(() => String)
  password: string;
}
