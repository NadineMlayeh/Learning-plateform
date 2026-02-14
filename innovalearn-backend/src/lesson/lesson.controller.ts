import {
  Controller,
  Post,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { LessonService } from './lesson.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller()
export class LessonController {
  constructor(private lessonService: LessonService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.FORMATEUR)
  @Post('courses/:courseId/lessons')
  createLesson(
    @Param('courseId') courseId: string,
    @Body() dto: CreateLessonDto,
    @Req() req,
  ) {
    return this.lessonService.createLesson(
      Number(courseId),
      dto,
      req.user.userId,
    );
  }
}
