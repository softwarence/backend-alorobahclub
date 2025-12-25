import { IsBoolean, IsOptional } from "class-validator";

export class UpdateNewsletterDto {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
