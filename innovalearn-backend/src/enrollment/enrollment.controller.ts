import { Controller, Post, Req, UseGuards, Get, Param } from '@nestjs/common';
import { EnrollmentService } from './enrollment.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('enrollments')
export class EnrollmentController {
  constructor(private enrollmentService: EnrollmentService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  @Post(':formationId')
  enroll(@Req() req, @Param('formationId') formationId: string) {
    return this.enrollmentService.enroll(req.user.userId, Number(formationId));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  @Get()
  getMyEnrollments(@Req() req) {
    return this.enrollmentService.getEnrollments(req.user.userId);
  }
}
