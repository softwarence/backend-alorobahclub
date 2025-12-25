import {
  IsArray,
  ArrayMinSize,
  IsMongoId,
  IsInt,
  Min,
  IsEnum,
  ValidateNested,
  IsObject,
} from "class-validator";
import { Type } from "class-transformer";

export enum PaymentMethod {
  APPLE_PAY = "apple_pay",
  MADA = "mada",
  VISA = "visa",
  MASTERCARD = "mastercard",
  COD = "cod",
}

class OrderItemDto {
  @IsMongoId()
  productId: string;

  @IsMongoId()
  variantId: string;

  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateOrderDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsObject()
  shippingAddress: Record<string, any>;
}
