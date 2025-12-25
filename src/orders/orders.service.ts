import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Order } from "./schemas/order.schema";
import { CreateOrderDto } from "./dto/create-order.dto";
import { Product } from "../products/schemas/product.schema";

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name)
    private readonly orderModel: Model<Order>,
    @InjectModel(Product.name) private productModel: Model<Product>
  ) {}

  async createOrder(userId: string, dto: CreateOrderDto) {
    const productIds = [...new Set(dto.items.map((item) => item.productId))];

    const products = await this.productModel.find({
      _id: { $in: productIds },
    });

    const productMap = new Map(products.map((p) => [p._id.toString(), p]));

    let subtotal = 0;
    const orderItems: any[] = [];

    for (const item of dto.items) {
      const product = productMap.get(item.productId);

      if (!product) {
        throw new NotFoundException(`Product ${item.productId} not found`);
      }

      const variant = product.variants.find(
        (v: any) => v._id.toString() === item.variantId
      );

      if (!variant) {
        throw new NotFoundException(`Variant ${item.variantId} not found`);
      }

      if (variant.stock < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for ${product.title.en}`
        );
      }

      subtotal += variant.price * item.quantity;

      orderItems.push({
        productId: new Types.ObjectId(item.productId),
        variantId: new Types.ObjectId(item.variantId),
        titleSnapshot: product.title,
        price: variant.price,
        quantity: item.quantity,
      });
    }

    const shippingFee = subtotal > 500 ? 0 : 30;
    const total = subtotal + shippingFee;

    const order = new this.orderModel({
      orderNumber: this.generateOrderNumber(),
      userId: new Types.ObjectId(userId),
      items: orderItems,
      subtotal,
      shippingFee,
      total,
      paymentMethod: dto.paymentMethod,
      shippingAddress: dto.shippingAddress,
    });

    return await order.save();
  }

  async updateOrder(orderId: string, updateData: Partial<Order>) {
    const updatedOrder = await this.orderModel.findByIdAndUpdate(
      orderId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedOrder) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    return updatedOrder;
  }

  async findAll(query: { page?: number; limit?: number; status?: string }) {
    const { page = 1, limit = 10, status } = query;

    const filter: any = {};
    if (status) {
      filter.orderStatus = status;
    }

    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      this.orderModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.orderModel.countDocuments(filter),
    ]);

    return {
      data: orders,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async deleteOrder(orderId: string) {
    const deletedOrder = await this.orderModel
      .findByIdAndDelete(orderId)
      .lean();

    if (!deletedOrder) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    return {
      code: 200,
      message: `Order #${deletedOrder.orderNumber} has been successfully deleted`,
      data: {
        id: orderId,
        orderNumber: deletedOrder.orderNumber,
        deletedAt: new Date().toISOString(),
      },
    };
  }

  async deleteBulkOrders(orderIds: string[]) {
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      throw new BadRequestException("Please provide an array of order IDs");
    }

    const objectIds = orderIds.map((id) => new Types.ObjectId(id));

    const result = await this.orderModel.deleteMany({
      _id: { $in: objectIds },
    });

    if (result.deletedCount === 0) {
      throw new NotFoundException("No orders found to delete");
    }

    return {
      code: 200,
      message: "Bulk delete successful",
      data: {
        deletedCount: result.deletedCount,
      },
    };
  }

  async findUserOrders(userId: string) {
    return this.orderModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .lean();
  }

  async findByOrderNumber(orderNumber: string) {
    const order = await this.orderModel.findOne({ orderNumber }).lean();

    if (!order) {
      throw new NotFoundException(`Order #${orderNumber} not found`);
    }

    return {
      code: 200,
      message: "Order retrieved successfully",
      data: order,
    };
  }

  private generateOrderNumber(): string {
    return `ORD-${Date.now()}`;
  }
}
