import { PartialType } from "@nestjs/mapped-types";
import { AddToCartDto } from "./create-cart.dto";

// src/carts/dto/update-cart-item.dto.ts
import { IsNumber, IsMongoId, Min, IsOptional } from "class-validator";

export class UpdateCartItemDto {
  @IsMongoId()
  productId: string;

  @IsOptional()
  @IsMongoId()
  variantId?: string;

  @IsNumber()
  @Min(1)
  quantity: number;
}
