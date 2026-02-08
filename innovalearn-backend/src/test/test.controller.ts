import { Controller, Get, UseGuards, Post } from '@nestjs/common';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('test')
export class TestController {

  // Anyone logged in can see this
  @UseGuards(JwtAuthGuard)
  @Get('any-user')
  anyUserRoute() {
    return "Any logged-in user can access";
  }

  // Admin only
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('admin-only')
  adminOnlyRoute() {
    return "Only admin can see this";
  }

  // Formateur + Admin
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.FORMATEUR)
  @Get('formateur-or-admin')
  formateurOrAdminRoute() {
    return "Only admin or formateur can see this";
  }

  // Student only
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  @Get('student-only')
  studentOnlyRoute() {
    return "Only students can see this";
  }
}
