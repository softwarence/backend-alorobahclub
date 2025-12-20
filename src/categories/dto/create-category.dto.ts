import { IsString, IsOptional, IsMongoId } from "class-validator";

export class CreateCategoryDto {
  name: {
    en: string;
    ar: string;
  };

  @IsString()
  slug: string;

  @IsOptional()
  @IsMongoId()
  parentId?: string;
}
