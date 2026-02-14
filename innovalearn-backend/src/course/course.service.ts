import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCourseDto } from './dto/create-course.dto';

@Injectable()
export class CourseService {
  constructor(private prisma: PrismaService) {}

  async createCourse(
    formationId: number,
    dto: CreateCourseDto,
    formateurId: number,
  ) {
    // 1️⃣ Check formation exists
    const formation = await this.prisma.formation.findUnique({
      where: { id: formationId },
    });

    if (!formation) {
      throw new NotFoundException('Formation not found');
    }

    // 2️⃣ Check ownership
    if (formation.formateurId !== formateurId) {
      throw new ForbiddenException(
        'You cannot add courses to this formation',
      );
    }

    // 3️⃣ Create course (default published = false)
    return this.prisma.course.create({
      data: {
        title: dto.title,
        formationId,
      },
    });
  }

 async publishCourse(courseId: number, formateurId: number) {
  // 1️⃣ Fetch course with lessons and quizzes
  const course = await this.prisma.course.findUnique({
    where: { id: courseId },
    include: {
      formation: true,
      lessons: true,        // include lessons
      quizzes: { include: { questions: true } }, // include quizzes & questions
    },
  });

  if (!course) throw new NotFoundException('Course not found');

  // 2️⃣ Check ownership
  if (course.formation.formateurId !== formateurId)
    throw new ForbiddenException('You cannot publish this course');

  // 3️⃣ Check minimum requirements
  if (!course.lessons || course.lessons.length < 1)
    throw new BadRequestException('Course must have at least 1 lesson');

  const quizCount = course.quizzes.length;
  if (quizCount < 3)
    throw new BadRequestException('Course must have at least 3 quizzes');

  // 4️⃣ All checks passed → publish course
  return this.prisma.course.update({
    where: { id: courseId },
    data: { published: true },
  });
}
}
