import {
  Controller,
  Get,
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
// Approve a student's enrollment
@Patch('enrollment/:id/approve')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
approveEnrollment(@Param('id') id: string) {
  return this.prisma.enrollment.update({
    where: { id: Number(id) },
    data: { status: 'APPROVED' },
  });
}

// Reject a student's enrollment
@Patch('enrollment/:id/reject')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
rejectEnrollment(@Param('id') id: string) {
  return this.prisma.enrollment.update({
    where: { id: Number(id) },
    data: { status: 'REJECTED' },
  });
}

// Optional: Get all pending enrollments for admin dashboard
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Get('enrollments/pending')
getPendingEnrollments() {
  return this.prisma.enrollment.findMany({
    where: { status: 'PENDING' },
    include: {
      student: { select: { id: true, name: true, email: true } },
      formation: { select: { id: true, title: true } },
    },
  });
}

  @Patch('formateur/:id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  approveFormateur(@Param('id') id: string) {
    return this.prisma.user.update({
      where: { id: Number(id) },
      data: { formateurStatus: 'APPROVED' },
    });
  }

  @Patch('formateur/:id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  rejectFormateur(@Param('id') id: string) {
    return this.prisma.user.update({
      where: { id: Number(id) },
      data: { formateurStatus: 'REJECTED' },
    });
  }
}
