import { IsEnum, IsNotEmpty, IsString, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

class LocalizedTextDto {
  @IsString()
  @IsNotEmpty()
  en: string;

  @IsString()
  @IsNotEmpty()
  ar: string;
}

export class CreateBlogDto {
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  title: LocalizedTextDto;

  @ValidateNested()
  @Type(() => LocalizedTextDto)
  content: LocalizedTextDto;

  @IsString()
  @IsNotEmpty()
  slug: string;

  @IsEnum(["published", "draft"])
  status: "published" | "draft";
}
