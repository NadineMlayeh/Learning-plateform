import {
  Controller,
  Patch,
  Param,
  UseGuards,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('admin')
export class AdminController {
  constructor(private prisma: PrismaService) {}

  @Patch('formateur/:id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  approveFormateur(@Param('id') id: string) {
    return this.prisma.user.update({
      where: { id: Number(id) },
      data: { formateurStatus: 'APPROVED' },
    });
  }
}
