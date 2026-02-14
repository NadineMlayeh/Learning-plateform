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
    const formation = await this.prisma.formation.findUnique({
      where: { id: formationId },
    });

    if (!formation) {
      throw new NotFoundException('Formation not found');
    }

    if (formation.formateurId !== formateurId) {
      throw new ForbiddenException(
        'You cannot add courses to this formation',
      );
    }

    if (formation.published) {
      throw new BadRequestException(
        'Published formation cannot be altered',
      );
    }

    if (formation.type === 'PRESENTIEL') {
      throw new BadRequestException(
        'Presentiel formation cannot contain online courses',
      );
    }

    return this.prisma.course.create({
      data: {
        title: dto.title,
        formationId,
      },
    });
  }

  async publishCourse(courseId: number, formateurId: number) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        formation: true,
        lessons: true,
        quizzes: {
          include: { questions: true },
        },
      },
    });

    if (!course) throw new NotFoundException('Course not found');

    if (course.formation.formateurId !== formateurId) {
      throw new ForbiddenException('You cannot publish this course');
    }

    if (course.formation.published) {
      throw new BadRequestException(
        'Published formation cannot be altered',
      );
    }

    if (!course.lessons || course.lessons.length < 1) {
      throw new BadRequestException(
        'Course must have at least 1 lesson',
      );
    }

    if (course.quizzes.length < 3) {
      throw new BadRequestException(
        'Course must have at least 3 quizzes',
      );
    }

    return this.prisma.course.update({
      where: { id: courseId },
      data: { published: true },
    });
  }
}
