import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';

@Injectable()
export class LessonService {
  constructor(private prisma: PrismaService) {}

  async createLesson(
    courseId: number,
    dto: CreateLessonDto,
    formateurId: number,
  ) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        formation: true,
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (course.formation.formateurId !== formateurId) {
      throw new ForbiddenException(
        'You cannot add lessons to this course',
      );
    }

    if (course.formation.published || course.published) {
      throw new BadRequestException(
        'Published content cannot be altered',
      );
    }

    return this.prisma.lesson.create({
      data: {
        title: dto.title,
        pdfUrl: dto.pdfUrl,
        courseId,
      },
    });
  }

  async updateLesson(
    lessonId: number,
    dto: UpdateLessonDto,
    formateurId: number,
  ) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        course: {
          include: {
            formation: true,
          },
        },
      },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    if (lesson.course.formation.formateurId !== formateurId) {
      throw new ForbiddenException(
        'You cannot edit this lesson',
      );
    }

    if (lesson.course.formation.published || lesson.course.published) {
      throw new BadRequestException(
        'Published content cannot be altered',
      );
    }

    return this.prisma.lesson.update({
      where: { id: lessonId },
      data: {
        title: dto.title ?? lesson.title,
        pdfUrl: dto.pdfUrl ?? lesson.pdfUrl,
      },
    });
  }
}
