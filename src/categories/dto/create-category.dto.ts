import { IsString, IsOptional, IsMongoId, IsNotEmpty } from "class-validator";
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
  parentId?: Types.ObjectId;
}
