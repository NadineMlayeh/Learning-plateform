import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLessonDto } from './dto/create-lesson.dto';

@Injectable()
export class LessonService {
  constructor(private prisma: PrismaService) {}

  async createLesson(
    courseId: number,
    dto: CreateLessonDto,
    formateurId: number,
  ) {
    // 1️⃣ Check course exists and include formation
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        formation: true,
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // 2️⃣ Check ownership via formation
    if (course.formation.formateurId !== formateurId) {
      throw new ForbiddenException(
        'You cannot add lessons to this course',
      );
    }

    // 3️⃣ Create lesson
    return this.prisma.lesson.create({
      data: {
        title: dto.title,
        pdfUrl: dto.pdfUrl,
        courseId,
      },
    });
  }
}
