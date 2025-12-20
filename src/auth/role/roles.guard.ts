// roles.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Role } from "./roles.enum";
import { ROLES_KEY } from "./roles.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 1. Get the required roles from the decorator
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no roles are defined, allow access
    if (!requiredRoles) {
      return true;
    }

    // 2. Get the user from the request (attached by JwtAuthGuard)
    const { user } = context.switchToHttp().getRequest();

    // 3. Check if user exists and has the required role
    // Note: 'role' must exist on your JWT payload or User object
    const hasRole = requiredRoles.some((role) => user.role?.includes(role));

    if (!hasRole) {
      throw new ForbiddenException(
        "You do not have permission to access this resource"
      );
    }

    return true;
  }
}
