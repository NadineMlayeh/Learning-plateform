import {
  Controller,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { CourseService } from './course.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller()
export class CourseController {
  constructor(private courseService: CourseService) {}

  // Create course inside a formation
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.FORMATEUR)
  @Post('formations/:formationId/courses')
  createCourse(
    @Param('formationId') formationId: string,
    @Body() dto: CreateCourseDto,
    @Req() req,
  ) {
    return this.courseService.createCourse(
      Number(formationId),
      dto,
      req.user.userId,
    );
  }

  // Publish course
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.FORMATEUR)
  @Patch('courses/:id/publish')
  publishCourse(@Param('id') id: string, @Req() req) {
    return this.courseService.publishCourse(
      Number(id),
      req.user.userId,
    );
  }
}
