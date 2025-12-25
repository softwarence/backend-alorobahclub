import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  UseGuards,
  Query,
} from "@nestjs/common";
import { OrdersService } from "./orders.service";
import { CreateOrderDto } from "./dto/create-order.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { Roles } from "../auth/role/roles.decorator";
import { RolesGuard } from "../auth/role/roles.guard";
import { Role } from "../auth/role/roles.enum";

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post("orders")
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateOrderDto, @Req() req: Request) {
    const userId = (req as Request & { user: { sub: string } }).user.sub;
    return this.ordersService.createOrder(userId, dto);
  }

  @Get("orders")
  async myOrders(@Req() req: Request) {
    const userId = (req as Request & { user: { sub: string } }).user.sub;
    return this.ordersService.findUserOrders(userId);
  }

  @Get("orders/:orderNumber")
  @Roles(Role.ADMIN)
  async getOrder(@Param("orderNumber") orderNumber: string) {
    return this.ordersService.findByOrderNumber(orderNumber);
  }

  @Get("admin/orders")
  @Roles(Role.ADMIN)
  findAll(
    @Query("page") page: number,
    @Query("limit") limit: number,
    @Query("status") status: string
  ) {
    return this.ordersService.findAll({ page, limit, status });
  }

  @Delete("orders/bulk")
  @Roles(Role.ADMIN)
  removeBulk(@Body("ids") ids: string[]) {
    return this.ordersService.deleteBulkOrders(ids);
  }

  @Patch("orders/:id")
  @Roles(Role.ADMIN)
  update(@Param("id") id: string, @Body() updateOrderDto: any) {
    return this.ordersService.updateOrder(id, updateOrderDto);
  }

  @Delete("orders/:id")
  @Roles(Role.ADMIN)
  remove(@Param("id") id: string) {
    return this.ordersService.deleteOrder(id);
  }
}
