import {
  IsString,
  IsArray,
  IsOptional,
  IsNumber,
  IsObject,
  ValidateNested,
  IsNotEmpty,
  IsMongoId,
} from "class-validator";
import { Type } from "class-transformer";

class LocaleStringDto {
  @IsString()
  @IsNotEmpty()
  en: string;

  @IsString()
  @IsNotEmpty()
  ar: string;
}

class VariantAttributesDto {
  @IsOptional()
  @IsString()
  size?: string;

  @IsOptional()
  @IsString()
  color?: string;
}

class VariantDto {
  @IsString()
  @IsNotEmpty()
  sku: string;

  @IsObject()
  @ValidateNested()
  @Type(() => VariantAttributesDto)
  attributes: VariantAttributesDto;

  @IsNumber()
  price: number;

  @IsOptional()
  @IsNumber()
  compareAtPrice?: number;

  @IsNumber()
  stock: number;
}

export class CreateProductDto {
  @IsObject()
  @ValidateNested()
  @Type(() => LocaleStringDto)
  title: LocaleStringDto;

  @IsObject()
  @ValidateNested()
  @Type(() => LocaleStringDto)
  description: LocaleStringDto;

  @IsString()
  @IsNotEmpty()
  slug: string;

  @IsArray()
  @IsMongoId({ each: true })
  @IsNotEmpty({ each: true })
  categoryIds: string[];

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantDto)
  variants: VariantDto[];
}
