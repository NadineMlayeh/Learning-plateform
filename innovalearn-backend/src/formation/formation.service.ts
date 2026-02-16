import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFormationDto } from './dto/create-formation.dto';
import { Role } from '@prisma/client';

@Injectable()
export class FormationService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateFormationDto, formateurId: number) {
    const formateur = await this.prisma.user.findUnique({
      where: { id: formateurId },
    });

    if (
      !formateur ||
      formateur.role !== Role.FORMATEUR ||
      formateur.formateurStatus !== 'APPROVED'
    ) {
      throw new ForbiddenException('You are not an approved formateur');
    }

    return this.prisma.formation.create({
      data: {
        title: dto.title,
        description: dto.description,
        price: dto.price,
        type: dto.type,
        location: dto.location,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        formateurId,
        published: false,
      },
    });
  }

  findAll() {
    return this.prisma.formation.findMany({
      where: { published: true },
      include: {
        formateur: {
          select: { id: true, email: true },
        },
      },
    });
  }

  async findManageFormations(formateurId: number) {
    return this.prisma.formation.findMany({
      where: { formateurId },
      include: {
        courses: {
          include: {
            lessons: true,
            quizzes: {
              include: {
                questions: {
                  include: {
                    choices: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findManageFormationById(
    formationId: number,
    formateurId: number,
  ) {
    const formation = await this.prisma.formation.findFirst({
      where: { id: formationId, formateurId },
      include: {
        courses: {
          include: {
            lessons: true,
            quizzes: {
              include: {
                questions: {
                  include: {
                    choices: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!formation) {
      throw new NotFoundException(
        'Formation not found or not accessible',
      );
    }

    return formation;
  }

  async publishFormation(formationId: number, formateurId: number) {
    const formation = await this.prisma.formation.findUnique({
      where: { id: formationId },
      include: { courses: true },
    });

    if (!formation) {
      throw new NotFoundException('Formation not found');
    }

    if (formation.formateurId !== formateurId) {
      throw new ForbiddenException('You cannot publish this formation');
    }

    if (formation.type === 'PRESENTIEL') {
      return this.prisma.formation.update({
        where: { id: formationId },
        data: { published: true },
      });
    }

    if (!formation.courses || formation.courses.length === 0) {
      throw new BadRequestException(
        'Online formation must contain at least one course',
      );
    }

    const hasDraftCourse = formation.courses.some(
      (course) => !course.published,
    );

    if (hasDraftCourse) {
      throw new BadRequestException(
        'All courses must be published before publishing the formation',
      );
    }

    return this.prisma.formation.update({
      where: { id: formationId },
      data: { published: true },
    });
  }

  async findFormationDetails(formationId: number, studentId: number) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { studentId_formationId: { studentId, formationId } },
    });

    if (!enrollment) {
      throw new ForbiddenException(
        'You are not enrolled in this formation',
      );
    }

    if (enrollment.status !== 'APPROVED') {
      throw new ForbiddenException(
        'Your enrollment is not approved yet',
      );
    }

    return this.prisma.formation.findUnique({
      where: { id: formationId },
      include: {
        results: {
          where: { studentId },
          select: {
            id: true,
            completed: true,
            certificateUrl: true,
            createdAt: true,
          },
        },
        courses: {
          where: { published: true },
          include: {
            results: {
              where: { studentId },
              select: {
                id: true,
                score: true,
                passed: true,
                badgeUrl: true,
                createdAt: true,
              },
            },
            lessons: true,
            quizzes: {
              include: {
                questions: {
                  include: { choices: true },
                },
              },
            },
          },
        },
      },
    });
  }
}
