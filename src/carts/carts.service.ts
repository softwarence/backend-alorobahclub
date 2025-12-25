// cart/cart.service.ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Cart, CartItem } from "./schemas/cart.schema";
import { Product } from "../products/schemas/product.schema";
import { Model, Types } from "mongoose";

const FIFTEEN_DAYS = 15 * 24 * 60 * 60 * 1000; // 15 days in ms

@Injectable()
export class CartService {
  constructor(
    @InjectModel(Cart.name) private cartModel: Model<Cart>,
    @InjectModel(Product.name) private productModel: Model<Product>
  ) {}

  async getCart(identifier: string): Promise<Cart | { items: CartItem[] }> {
    const isUser = Types.ObjectId.isValid(identifier);
    const query = isUser
      ? { userId: new Types.ObjectId(identifier) }
      : { guestId: identifier };

    const cart = await this.cartModel
      .findOne(query)
      .populate("items.productId");
    if (!cart) return { items: [] };
    return cart;
  }

  async addToCart(
    identifier: string,
    productId: string,
    quantity: number,
    variantId?: string
  ): Promise<Cart> {
    const product = await this.productModel.findById(productId);
    if (!product) throw new NotFoundException("Product not found");

    if (!variantId)
      throw new BadRequestException("Please specify a product variant");

    const variant = product.variants.find(
      (v) => v._id.toString() === variantId
    );
    if (!variant) throw new BadRequestException("Variant not found");

    const isUser = Types.ObjectId.isValid(identifier);
    const query = isUser
      ? { userId: new Types.ObjectId(identifier) }
      : { guestId: identifier };

    let cart = await this.cartModel.findOne(query);

    if (!cart) {
      cart = new this.cartModel({
        ...(isUser
          ? { userId: new Types.ObjectId(identifier) }
          : {
              guestId: identifier,
              expiresAt: new Date(Date.now() + FIFTEEN_DAYS),
            }),
        items: [],
      });
    }

    if (!isUser) cart.expiresAt = new Date(Date.now() + FIFTEEN_DAYS);

    const itemIndex = cart.items.findIndex(
      (i) =>
        i.productId.toString() === productId &&
        i.variantId?.toString() === variantId
    );

    if (itemIndex > -1) {
      cart.items[itemIndex].quantity += quantity;
      cart.items[itemIndex].price = Number(
        (variant.price * cart.items[itemIndex].quantity).toFixed(2)
      );
    } else {
      cart.items.push({
        productId: new Types.ObjectId(productId),
        variantId: new Types.ObjectId(variantId),
        quantity,
        price: Number((variant.price * quantity).toFixed(2)),
      });
    }

    return cart.save();
  }

  async updateCartItem(
    identifier: string,
    productId: string,
    quantity: number,
    variantId?: string
  ): Promise<Cart> {
    if (quantity <= 0)
      throw new BadRequestException("Quantity must be at least 1");

    const isUser = Types.ObjectId.isValid(identifier);

    const query = isUser
      ? { userId: new Types.ObjectId(identifier) }
      : { guestId: identifier };

    const cart = await this.cartModel.findOne(query);
    if (!cart) throw new NotFoundException("Cart not found");

    if (!isUser) {
      cart.expiresAt = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
    }

    const item = cart.items.find((i) => {
      const itemVariant = i.variantId ? i.variantId.toString() : null;
      const targetVariant = variantId ?? null;
      return (
        i.productId.toString() === productId && itemVariant === targetVariant
      );
    });

    if (!item) throw new NotFoundException("Item not found in cart");

    const product = await this.productModel.findById(productId);
    if (!product) throw new NotFoundException("Product not found");

    let variantPrice = 0;
    if (variantId) {
      const variant = product.variants.find(
        (v: any) => v._id.toString() === variantId
      );
      if (!variant) throw new BadRequestException("Variant not found");
      variantPrice = variant.price;
    } else {
      variantPrice = (product as any).price ?? 0;
    }

    item.quantity = quantity;
    item.price = variantPrice * quantity;

    return cart.save();
  }

  async removeFromCart(
    identifier: string,
    productId: string,
    variantId?: string
  ): Promise<Cart> {
    const isUser = Types.ObjectId.isValid(identifier);
    const query = isUser
      ? { userId: new Types.ObjectId(identifier) }
      : { guestId: identifier };

    const cart = await this.cartModel.findOne(query);
    if (!cart) throw new NotFoundException("Cart not found");

    // Refresh TTL for guest
    if (!isUser) cart.expiresAt = new Date(Date.now() + FIFTEEN_DAYS);

    const initialLength = cart.items.length;
    cart.items = cart.items.filter(
      (item) =>
        !(
          item.productId.toString() === productId &&
          (item.variantId?.toString() ?? null) === (variantId ?? null)
        )
    );

    if (cart.items.length === initialLength) {
      throw new NotFoundException("Item not found in cart");
    }

    return cart.save();
  }

  async mergeCart(userId: string, guestId: string): Promise<Cart | undefined> {
    if (!Types.ObjectId.isValid(userId)) throw new Error("Invalid userId");
    const userObjectId = new Types.ObjectId(userId);

    const [guestCart, userCart] = await Promise.all([
      this.cartModel.findOne({ guestId }),
      this.cartModel.findOne({ userId: userObjectId }),
    ]);

    if (!guestCart) return userCart ?? undefined;

    if (!userCart) {
      guestCart.userId = userObjectId;
      guestCart.set("guestId", undefined);
      guestCart.set("expiresAt", undefined);
      return await guestCart.save();
    }

    if (guestCart.items.length > 0) {
      const userItemMap = new Map<string, CartItem>();
      for (const item of userCart.items) {
        const key = `${item.productId.toString()}_${item.variantId?.toString() ?? "null"}`;
        userItemMap.set(key, item);
      }

      for (const guestItem of guestCart.items) {
        const key = `${guestItem.productId.toString()}_${guestItem.variantId?.toString() ?? "null"}`;
        if (!userItemMap.has(key)) {
          userCart.items.push({
            productId: guestItem.productId,
            variantId: guestItem.variantId ?? null,
            quantity: guestItem.quantity,
            price: guestItem.price,
          });
          userItemMap.set(key, guestItem);
        }
      }

      await userCart.save();
    }

    await this.cartModel.deleteOne({ _id: guestCart._id });

    return userCart;
  }

  async clearCart(identifier: string): Promise<Cart | null> {
    if (!identifier) return null;

    const isUser = Types.ObjectId.isValid(identifier);
    const query = isUser
      ? { userId: new Types.ObjectId(identifier) }
      : { guestId: identifier };

    const cart = await this.cartModel.findOneAndUpdate(
      query,
      { $set: { items: [] } },
      { new: true }
    );

    // Refresh TTL for guest cart
    if (cart && !isUser) {
      cart.expiresAt = new Date(Date.now() + FIFTEEN_DAYS);
      await cart.save();
    }

    return cart;
  }
}
