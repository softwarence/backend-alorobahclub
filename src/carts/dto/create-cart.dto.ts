import {
  IsNotEmpty,
  IsNumber,
  IsMongoId,
  Min,
  IsOptional,
  IsString,
} from "class-validator";

export class AddToCartDto {
  @IsMongoId()
  @IsNotEmpty()
  productId: string;

  @IsOptional()
  @IsMongoId()
  variantId?: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsString()
  guestId?: string;
}
