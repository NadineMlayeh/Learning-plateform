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
      orderBy: { createdAt: 'desc' },
      include: {
        formateur: {
          select: { id: true, email: true },
        },
      },
    });
  }

  async getFormateurAnalytics(formateurId: number) {
    const formations = await this.prisma.formation.findMany({
      where: { formateurId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        type: true,
        price: true,
        published: true,
        createdAt: true,
        enrollments: {
          select: {
            id: true,
            status: true,
            studentId: true,
            createdAt: true,
            student: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        courses: {
          select: {
            id: true,
            title: true,
          },
        },
        results: {
          select: {
            studentId: true,
            completed: true,
            certificateUrl: true,
          },
        },
      },
    });

    const allCourseIds = formations.flatMap((formation) =>
      formation.courses.map((course) => course.id),
    );

    const courseResults =
      allCourseIds.length === 0
        ? []
        : await this.prisma.courseResult.findMany({
            where: {
              courseId: { in: allCourseIds },
            },
            select: {
              courseId: true,
              studentId: true,
              score: true,
              passed: true,
            },
          });

    const courseResultsByCourseId = new Map<
      number,
      { studentId: number; score: number; passed: boolean }[]
    >();

    for (const result of courseResults) {
      const existing = courseResultsByCourseId.get(result.courseId) || [];
      existing.push(result);
      courseResultsByCourseId.set(result.courseId, existing);
    }

    function round2(value: number) {
      return Math.round(value * 100) / 100;
    }

    const payload = formations.map((formation) => {
      const totalStudentsEnrolled = formation.enrollments.length;
      const approvedEnrollments = formation.enrollments
        .filter((entry) => entry.status === 'APPROVED')
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() -
            new Date(a.createdAt).getTime(),
        );

      const totalApprovedStudents = approvedEnrollments.length;
      const approvedStudentIds = new Set(
        approvedEnrollments.map((entry) => entry.studentId),
      );

      const formationResultByStudent = new Map(
        formation.results.map((entry) => [entry.studentId, entry]),
      );

      const enrolledStudents = approvedEnrollments.map((entry) => {
        const result = formationResultByStudent.get(entry.studentId);

        let completionStatus = 'IN_PROGRESS';
        if (result?.completed === true) completionStatus = 'COMPLETED_SUCCESS';
        else if (result) completionStatus = 'COMPLETED_FAIL';

        return {
          id: entry.student.id,
          name: entry.student.name,
          email: entry.student.email,
          completionStatus,
          certificateIssued: Boolean(result?.certificateUrl),
        };
      });

      const totalCompletedStudents = enrolledStudents.filter(
        (entry) => entry.completionStatus !== 'IN_PROGRESS',
      ).length;

      const totalSuccessfulStudents = enrolledStudents.filter(
        (entry) => entry.completionStatus === 'COMPLETED_SUCCESS',
      ).length;

      const completionRate =
        totalApprovedStudents === 0
          ? 0
          : round2((totalCompletedStudents / totalApprovedStudents) * 100);

      const successRate =
        totalApprovedStudents === 0
          ? 0
          : round2((totalSuccessfulStudents / totalApprovedStudents) * 100);

      const courses = formation.courses
        .map((course) => {
          const attempts = (
            courseResultsByCourseId.get(course.id) || []
          ).filter((result) => approvedStudentIds.has(result.studentId));

          const totalAttempts = attempts.length;
          const passedStudents = attempts.filter(
            (attempt) => attempt.passed,
          ).length;
          const failedStudents = totalAttempts - passedStudents;
          const averageScore =
            totalAttempts === 0
              ? 0
              : round2(
                  attempts.reduce((sum, attempt) => sum + attempt.score, 0) /
                    totalAttempts,
                );

          return {
            id: course.id,
            title: course.title,
            passedStudents,
            failedStudents,
            averageScore,
            totalAttempts,
          };
        })
        .sort((a, b) => b.id - a.id);

      return {
        formation: {
          id: formation.id,
          title: formation.title,
          description: formation.description,
          type: formation.type,
          price: formation.price,
          published: formation.published,
          createdAt: formation.createdAt,
        },
        enrolledStudents,
        statistics: {
          totalStudentsEnrolled,
          totalApprovedStudents,
          totalCompletedStudents,
          completionRate,
          successRate,
          averageScorePerCourse: courses.map((course) => ({
            courseId: course.id,
            title: course.title,
            averageScore: course.averageScore,
          })),
        },
        courseStatistics: courses,
      };
    });

    return {
      generatedAt: new Date().toISOString(),
      formations: payload,
    };
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
