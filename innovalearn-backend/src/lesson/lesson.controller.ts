import {
  Controller,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { LessonService } from './lesson.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
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

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.FORMATEUR)
  @Patch('lessons/:lessonId')
  updateLesson(
    @Param('lessonId') lessonId: string,
    @Body() dto: UpdateLessonDto,
    @Req() req,
  ) {
    return this.lessonService.updateLesson(
      Number(lessonId),
      dto,
      req.user.userId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.FORMATEUR)
  @Delete('lessons/:lessonId')
  deleteLesson(@Param('lessonId') lessonId: string, @Req() req) {
    return this.lessonService.deleteLesson(
      Number(lessonId),
      req.user.userId,
    );
  }
}
