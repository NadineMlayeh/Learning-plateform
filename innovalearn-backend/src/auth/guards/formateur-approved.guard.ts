import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Role } from '@prisma/client';

@Injectable()
export class FormateurApprovedGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // If not a formateur → we don't care
    if (user.role !== Role.FORMATEUR) {
      return true;
    }

    // If formateur but not approved → BLOCK
    if (user.formateurStatus !== 'APPROVED') {
      throw new ForbiddenException(
        'Your formateur account is not approved yet',
      );
    }

    return true;
  }
}
