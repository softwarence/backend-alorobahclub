import { IsEmail } from "class-validator";

export class CreateNewsletterDto {
  @IsEmail()
  email: string;
}
