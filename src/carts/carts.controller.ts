import {
  Controller,
  Post,
  Get,
  Delete,
  Patch,
  Body,
  Req,
  Headers,
  BadRequestException,
} from "@nestjs/common";
import { CartService } from "./carts.service";
import { AddToCartDto } from "./dto/create-cart.dto";
import { UpdateCartItemDto } from "./dto/update-cart.dto";
import { JwtService } from "@nestjs/jwt";

@Controller("carts")
export class CartController {
  constructor(
    private readonly cartService: CartService,
    private readonly jwtService: JwtService
  ) {}

  private extractUserId(auth?: string): string | undefined {
    let userId: string | undefined;
    if (auth?.startsWith("Bearer ")) {
      const token = auth.split(" ")[1];
      try {
        const payload = this.jwtService.verify(token);
        userId = payload.sub;
      } catch (err) {}
    }
    return userId;
  }

  @Post()
  async add(
    @Body() dto: AddToCartDto,
    @Req() req: any,
    @Headers("x-device-id") deviceId?: string,
    @Headers("authorization") auth?: string
  ) {
    const userId = this.extractUserId(auth);
    const identifier = userId ?? deviceId;

    console.log(userId, identifier);

    if (!identifier) {
      throw new BadRequestException("Provide x-device-id header or login.");
    }

    if (userId && deviceId) {
      await this.cartService.mergeCart(userId, deviceId);
    }

    const data = await this.cartService.addToCart(
      identifier,
      dto.productId,
      dto.quantity,
      dto.variantId
    );

    return { message: "Added to cart", data };
  }

  @Patch()
  async updateItem(
    @Body() dto: UpdateCartItemDto,
    @Req() req: any,
    @Headers("x-device-id") deviceId?: string,
    @Headers("authorization") auth?: string
  ) {
    const userId = this.extractUserId(auth);
    const identifier = userId ?? deviceId;
    if (!identifier) throw new BadRequestException("Identification required.");

    const data = await this.cartService.updateCartItem(
      identifier,
      dto.productId,
      dto.quantity,
      dto.variantId
    );
    return { message: "Cart updated", data };
  }

  @Delete()
  async removeItem(
    @Body() dto: { productId: string; variantId?: string },
    @Req() req: any,
    @Headers("x-device-id") deviceId?: string,
    @Headers("authorization") auth?: string
  ) {
    const userId = this.extractUserId(auth);
    const identifier = userId ?? deviceId;
    if (!identifier) throw new BadRequestException("Identification required.");

    const data = await this.cartService.removeFromCart(
      identifier,
      dto.productId,
      dto.variantId
    );

    return { message: "Item removed from cart", data };
  }

  @Get()
  async getMyCart(
    @Req() req: any,
    @Headers("x-device-id") deviceId?: string,
    @Headers("authorization") auth?: string
  ) {
    const userId = this.extractUserId(auth);
    const identifier = userId ?? deviceId;
    if (!identifier)
      throw new BadRequestException(
        "No user or device identification provided."
      );

    return this.cartService.getCart(identifier);
  }

  @Post("sync")
  async syncCart(
    @Req() req: any,
    @Headers("x-device-id") deviceId?: string,
    @Headers("authorization") auth?: string
  ) {
    const userId = this.extractUserId(auth);
    if (!userId) throw new BadRequestException("Invalid user login.");

    if (deviceId) {
      await this.cartService.mergeCart(userId, deviceId);
    }

    const cart = await this.cartService.getCart(userId);
    return { message: "Cart synced successfully", data: cart };
  }

  @Post("clear")
  async clearCart(
    @Req() req: any,
    @Headers("x-device-id") deviceId?: string,
    @Headers("authorization") auth?: string
  ) {
    const userId = this.extractUserId(auth);
    const identifier = userId ?? deviceId;
    if (!identifier) return { cart: null };

    const cart = await this.cartService.clearCart(identifier);
    return { cart };
  }
}
