import {
  IsString,
  IsOptional,
  IsMongoId,
  IsNotEmpty,
  IsInt,
  Min,
} from "class-validator";
import { Types } from "mongoose";

export class CreateCategoryDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  slug: string;

  @IsOptional()
  @IsMongoId()
  parentId?: string;

  @IsInt()
  @Min(0)
  level: number;
}
