import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EnrollmentService } from '../enrollment/enrollment.service';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { FormateurStatus, Role } from '@prisma/client';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(
    private prisma: PrismaService,
    private enrollmentService: EnrollmentService,
    private adminService: AdminService,
  ) {}

  @Patch('enrollment/:id/approve')
  approveEnrollment(@Param('id') id: string) {
    return this.enrollmentService.updateEnrollmentStatus(
      Number(id),
      'APPROVED',
    );
  }

  @Patch('enrollment/:id/reject')
  rejectEnrollment(@Param('id') id: string) {
    return this.enrollmentService.updateEnrollmentStatus(
      Number(id),
      'REJECTED',
    );
  }

  @Get('enrollments/pending')
  getPendingEnrollments() {
    return this.prisma.enrollment.findMany({
      where: { status: 'PENDING' },
      include: {
        student: { select: { id: true, name: true, email: true } },
        formation: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Patch('formateur/:id/approve')
  approveFormateur(@Param('id') id: string) {
    return this.prisma.user.update({
      where: { id: Number(id) },
      data: { formateurStatus: 'APPROVED' },
    });
  }

  @Patch('formateur/:id/reject')
  rejectFormateur(@Param('id') id: string) {
    return this.prisma.user.update({
      where: { id: Number(id) },
      data: { formateurStatus: 'REJECTED' },
    });
  }

  @Get('students')
  getStudents(@Query() query: Record<string, unknown>) {
    return this.adminService.getStudents(query);
  }

  @Get('students/:id')
  getStudentById(@Param('id') id: string) {
    return this.adminService.getStudentById(Number(id));
  }

  @Patch('students/:id')
  updateStudent(
    @Param('id') id: string,
    @Body() body: { name?: string; email?: string },
  ) {
    return this.adminService.updateStudent(Number(id), body || {});
  }

  @Delete('students/:id')
  deleteStudent(@Param('id') id: string) {
    return this.adminService.deleteStudent(Number(id));
  }

  @Get('formateurs')
  getFormateurs(@Query() query: Record<string, unknown>) {
    return this.adminService.getFormateurs(query);
  }

  @Get('formateurs/:id')
  getFormateurById(@Param('id') id: string) {
    return this.adminService.getFormateurById(Number(id));
  }

  @Patch('formateurs/:id')
  updateFormateur(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      email?: string;
      status?: FormateurStatus;
    },
  ) {
    return this.adminService.updateFormateur(Number(id), body || {});
  }

  @Delete('formateurs/:id')
  deleteFormateur(@Param('id') id: string) {
    return this.adminService.deleteFormateur(Number(id));
  }

  @Get('formateurs/:id/analytics')
  getFormateurAnalytics(
    @Param('id') id: string,
    @Query() query: Record<string, unknown>,
  ) {
    return this.adminService.getFormateurAnalytics(Number(id), query);
  }

  @Get('formations')
  getFormations(@Query() query: Record<string, unknown>) {
    return this.adminService.getFormations(query);
  }

  @Delete('formations/:id')
  deleteFormation(@Param('id') id: string) {
    return this.adminService.deleteFormation(Number(id));
  }

  @Get('revenue-overview')
  getRevenueOverview(@Query() query: Record<string, unknown>) {
    return this.adminService.getRevenueOverview(query);
  }

  @Get('analytics/overview')
  getGlobalOverview() {
    return this.adminService.getGlobalOverview();
  }
}
