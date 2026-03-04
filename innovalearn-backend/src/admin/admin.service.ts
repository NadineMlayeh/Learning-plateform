import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EnrollmentStatus,
  FormateurStatus,
  FormationType,
  Prisma,
  Role,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  private toNumber(value: unknown, fallback: number) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return Math.floor(parsed);
  }

  private round2(value: number) {
    return Math.round(value * 100) / 100;
  }

  private deriveStudentStatus(statuses: EnrollmentStatus[]) {
    if (statuses.includes('APPROVED')) return 'APPROVED';
    if (statuses.includes('PENDING')) return 'PENDING';
    if (statuses.includes('REJECTED')) return 'REJECTED';
    return 'NONE';
  }

  private async collectFormationTreeIds(
    tx: Prisma.TransactionClient,
    formationIds: number[],
  ) {
    if (formationIds.length === 0) {
      return { courseIds: [], quizIds: [], questionIds: [] };
    }

    const courses = await tx.course.findMany({
      where: { formationId: { in: formationIds } },
      select: { id: true },
    });
    const courseIds = courses.map((entry) => entry.id);

    const quizzes =
      courseIds.length === 0
        ? []
        : await tx.quiz.findMany({
            where: { courseId: { in: courseIds } },
            select: { id: true },
          });
    const quizIds = quizzes.map((entry) => entry.id);

    const questions =
      quizIds.length === 0
        ? []
        : await tx.question.findMany({
            where: { quizId: { in: quizIds } },
            select: { id: true },
          });
    const questionIds = questions.map((entry) => entry.id);

    return { courseIds, quizIds, questionIds };
  }

  private async deleteFormationTreeByIds(
    tx: Prisma.TransactionClient,
    formationIds: number[],
  ) {
    if (formationIds.length === 0) return;

    const { courseIds, quizIds, questionIds } =
      await this.collectFormationTreeIds(tx, formationIds);

    await tx.invoice.deleteMany({
      where: {
        enrollment: {
          formationId: { in: formationIds },
        },
      },
    });

    await tx.enrollment.deleteMany({
      where: { formationId: { in: formationIds } },
    });

    await tx.formationResult.deleteMany({
      where: { formationId: { in: formationIds } },
    });

    if (courseIds.length > 0) {
      await tx.courseResult.deleteMany({
        where: { courseId: { in: courseIds } },
      });

      await tx.lesson.deleteMany({
        where: { courseId: { in: courseIds } },
      });
    }

    if (quizIds.length > 0) {
      await tx.quizSubmission.deleteMany({
        where: { quizId: { in: quizIds } },
      });

      await tx.quiz.deleteMany({
        where: { id: { in: quizIds } },
      });
    }

    if (questionIds.length > 0) {
      await tx.choice.deleteMany({
        where: { questionId: { in: questionIds } },
      });

      await tx.question.deleteMany({
        where: { id: { in: questionIds } },
      });
    }

    if (courseIds.length > 0) {
      await tx.course.deleteMany({
        where: { id: { in: courseIds } },
      });
    }

    await tx.formation.deleteMany({
      where: { id: { in: formationIds } },
    });
  }

  async getStudents(query: Record<string, unknown>) {
    const page = this.toNumber(query.page, 1);
    const pageSize = Math.min(this.toNumber(query.pageSize, 10), 100);
    const search = String(query.search || '').trim();

    const where: Prisma.UserWhereInput = {
      role: 'STUDENT',
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, students] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          name: true,
          email: true,
          phoneNumber: true,
          dateOfBirth: true,
          isSuspended: true,
          createdAt: true,
          enrollments: {
            select: { status: true },
          },
          invoices: {
            select: { amount: true },
          },
          _count: {
            select: { enrollments: true },
          },
        },
      }),
    ]);

    return {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      items: students.map((student) => {
        const statuses = student.enrollments.map((entry) => entry.status);
        const totalAmountPaid = student.invoices.reduce(
          (sum, invoice) => sum + Number(invoice.amount || 0),
          0,
        );

        return {
          id: student.id,
          name: student.name,
          email: student.email,
          phoneNumber: student.phoneNumber,
          dateOfBirth: student.dateOfBirth,
          isSuspended: student.isSuspended,
          status: this.deriveStudentStatus(statuses),
          totalEnrollments: student._count.enrollments,
          totalAmountPaid: this.round2(totalAmountPaid),
          createdAt: student.createdAt,
        };
      }),
    };
  }

  async getStudentById(studentId: number) {
    const student = await this.prisma.user.findFirst({
      where: { id: studentId, role: 'STUDENT' },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        dateOfBirth: true,
        createdAt: true,
        enrollments: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            status: true,
            createdAt: true,
            formation: {
              select: {
                id: true,
                title: true,
                type: true,
                price: true,
              },
            },
            invoice: {
              select: {
                id: true,
                amount: true,
                pdfUrl: true,
                createdAt: true,
              },
            },
          },
        },
        invoices: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            amount: true,
            pdfUrl: true,
            createdAt: true,
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const totalAmountPaid = student.invoices.reduce(
      (sum, invoice) => sum + Number(invoice.amount || 0),
      0,
    );

    return {
      ...student,
      totalEnrollments: student.enrollments.length,
      totalAmountPaid: this.round2(totalAmountPaid),
      status: this.deriveStudentStatus(
        student.enrollments.map((entry) => entry.status),
      ),
    };
  }

  async updateStudent(
    studentId: number,
    payload: {
      name?: string;
      email?: string;
      phoneNumber?: string | null;
      dateOfBirth?: string | null;
    },
  ) {
    const student = await this.prisma.user.findFirst({
      where: { id: studentId, role: 'STUDENT' },
      select: { id: true },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const data: Prisma.UserUpdateInput = {};

    if (typeof payload.name === 'string' && payload.name.trim()) {
      data.name = payload.name.trim();
    }

    if (typeof payload.email === 'string' && payload.email.trim()) {
      data.email = payload.email.trim().toLowerCase();
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'phoneNumber')) {
      if (typeof payload.phoneNumber === 'string') {
        const trimmedPhone = payload.phoneNumber.trim();
        data.phoneNumber = trimmedPhone || null;
      } else if (payload.phoneNumber === null) {
        data.phoneNumber = null;
      }
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'dateOfBirth')) {
      if (payload.dateOfBirth === null || payload.dateOfBirth === '') {
        data.dateOfBirth = null;
      } else if (typeof payload.dateOfBirth === 'string') {
        const parsed = new Date(payload.dateOfBirth);
        if (Number.isNaN(parsed.getTime())) {
          throw new BadRequestException('Invalid date of birth');
        }
        data.dateOfBirth = parsed;
      }
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException(
        'At least one editable field must be provided',
      );
    }

    return this.prisma.user.update({
      where: { id: studentId },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        isSuspended: true,
        role: true,
      },
    });
  }

  async suspendStudent(studentId: number) {
    const student = await this.prisma.user.findFirst({
      where: { id: studentId, role: 'STUDENT' },
      select: { id: true, isSuspended: true },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    if (student.isSuspended) {
      return { id: studentId, isSuspended: true };
    }

    return this.prisma.user.update({
      where: { id: studentId },
      data: { isSuspended: true },
      select: { id: true, isSuspended: true },
    });
  }

  async unsuspendStudent(studentId: number) {
    const student = await this.prisma.user.findFirst({
      where: { id: studentId, role: 'STUDENT' },
      select: { id: true, isSuspended: true },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    if (!student.isSuspended) {
      return { id: studentId, isSuspended: false };
    }

    return this.prisma.user.update({
      where: { id: studentId },
      data: { isSuspended: false },
      select: { id: true, isSuspended: true },
    });
  }

  async deleteStudent(studentId: number) {
    const student = await this.prisma.user.findFirst({
      where: { id: studentId, role: 'STUDENT' },
      select: { id: true },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.invoice.deleteMany({ where: { studentId } });
      await tx.enrollment.deleteMany({ where: { studentId } });
      await tx.quizSubmission.deleteMany({ where: { studentId } });
      await tx.courseResult.deleteMany({ where: { studentId } });
      await tx.formationResult.deleteMany({ where: { studentId } });
      await tx.user.delete({ where: { id: studentId } });
    });

    return { message: 'Student deleted successfully' };
  }

  async getFormateurs(query: Record<string, unknown>) {
    const page = this.toNumber(query.page, 1);
    const pageSize = Math.min(this.toNumber(query.pageSize, 10), 100);
    const search = String(query.search || '').trim();

    const where: Prisma.UserWhereInput = {
      role: 'FORMATEUR',
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, formateurs] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          name: true,
          email: true,
          phoneNumber: true,
          dateOfBirth: true,
          isSuspended: true,
          createdAt: true,
          formateurStatus: true,
          formations: {
            select: {
              id: true,
              _count: {
                select: {
                  enrollments: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const formateurIds = formateurs.map((entry) => entry.id);
    const invoices =
      formateurIds.length === 0
        ? []
        : await this.prisma.invoice.findMany({
            where: {
              enrollment: {
                formation: {
                  formateurId: { in: formateurIds },
                },
              },
            },
            select: {
              amount: true,
              enrollment: {
                select: {
                  formation: {
                    select: {
                      formateurId: true,
                    },
                  },
                },
              },
            },
          });

    const revenueByFormateur = new Map<number, number>();
    invoices.forEach((invoice) => {
      const ownerId = invoice.enrollment?.formation?.formateurId;
      if (!ownerId) return;

      revenueByFormateur.set(
        ownerId,
        (revenueByFormateur.get(ownerId) || 0) + Number(invoice.amount || 0),
      );
    });

    return {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      items: formateurs.map((entry) => {
        const totalStudentsEnrolled = entry.formations.reduce(
          (sum, formation) => sum + formation._count.enrollments,
          0,
        );

        return {
          id: entry.id,
          name: entry.name,
          email: entry.email,
          phoneNumber: entry.phoneNumber,
          dateOfBirth: entry.dateOfBirth,
          isSuspended: entry.isSuspended,
          status: entry.formateurStatus || 'PENDING',
          formationsCount: entry.formations.length,
          totalStudentsEnrolled,
          totalRevenueGenerated: this.round2(
            revenueByFormateur.get(entry.id) || 0,
          ),
          createdAt: entry.createdAt,
        };
      }),
    };
  }

  async getFormateurById(formateurId: number) {
    const formateur = await this.prisma.user.findFirst({
      where: { id: formateurId, role: 'FORMATEUR' },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        dateOfBirth: true,
        createdAt: true,
        formateurStatus: true,
        formations: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            title: true,
            price: true,
            type: true,
            published: true,
            createdAt: true,
            enrollments: {
              select: {
                id: true,
                status: true,
              },
            },
            results: {
              select: {
                id: true,
                completed: true,
              },
            },
          },
        },
      },
    });

    if (!formateur) {
      throw new NotFoundException('Formateur not found');
    }

    const invoices = await this.prisma.invoice.findMany({
      where: {
        enrollment: {
          formation: {
            formateurId,
          },
        },
      },
      select: { amount: true },
    });

    const totalRevenueGenerated = invoices.reduce(
      (sum, invoice) => sum + Number(invoice.amount || 0),
      0,
    );

    const formations = formateur.formations.map((formation) => {
      const enrollmentsCount = formation.enrollments.length;
      const approvedCount = formation.enrollments.filter(
        (entry) => entry.status === 'APPROVED',
      ).length;
      const completedSuccessCount = formation.results.filter(
        (entry) => entry.completed,
      ).length;
      const successRate =
        approvedCount === 0
          ? 0
          : this.round2((completedSuccessCount / approvedCount) * 100);

      return {
        id: formation.id,
        title: formation.title,
        price: formation.price,
        type: formation.type,
        published: formation.published,
        createdAt: formation.createdAt,
        enrollmentsCount,
        successRate,
      };
    });

    const totalStudentsEnrolled = formations.reduce(
      (sum, formation) => sum + formation.enrollmentsCount,
      0,
    );

    return {
      ...formateur,
      formations,
      status: formateur.formateurStatus || 'PENDING',
      formationsCount: formations.length,
      totalStudentsEnrolled,
      totalRevenueGenerated: this.round2(totalRevenueGenerated),
    };
  }

  async updateFormateur(
    formateurId: number,
    payload: {
      name?: string;
      email?: string;
      status?: FormateurStatus;
      phoneNumber?: string | null;
      dateOfBirth?: string | null;
    },
  ) {
    const formateur = await this.prisma.user.findFirst({
      where: { id: formateurId, role: 'FORMATEUR' },
      select: { id: true },
    });

    if (!formateur) {
      throw new NotFoundException('Formateur not found');
    }

    const data: Prisma.UserUpdateInput = {};

    if (typeof payload.name === 'string' && payload.name.trim()) {
      data.name = payload.name.trim();
    }

    if (typeof payload.email === 'string' && payload.email.trim()) {
      data.email = payload.email.trim().toLowerCase();
    }

    if (
      payload.status &&
      ['PENDING', 'APPROVED', 'REJECTED'].includes(payload.status)
    ) {
      data.formateurStatus = payload.status;
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'phoneNumber')) {
      if (typeof payload.phoneNumber === 'string') {
        const trimmedPhone = payload.phoneNumber.trim();
        data.phoneNumber = trimmedPhone || null;
      } else if (payload.phoneNumber === null) {
        data.phoneNumber = null;
      }
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'dateOfBirth')) {
      if (payload.dateOfBirth === null || payload.dateOfBirth === '') {
        data.dateOfBirth = null;
      } else if (typeof payload.dateOfBirth === 'string') {
        const parsed = new Date(payload.dateOfBirth);
        if (Number.isNaN(parsed.getTime())) {
          throw new BadRequestException('Invalid date of birth');
        }
        data.dateOfBirth = parsed;
      }
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException(
        'At least one updatable field must be provided',
      );
    }

    return this.prisma.user.update({
      where: { id: formateurId },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        isSuspended: true,
        formateurStatus: true,
      },
    });
  }

  async suspendFormateur(formateurId: number) {
    const formateur = await this.prisma.user.findFirst({
      where: { id: formateurId, role: 'FORMATEUR' },
      select: { id: true, isSuspended: true },
    });

    if (!formateur) {
      throw new NotFoundException('Formateur not found');
    }

    if (formateur.isSuspended) {
      return { id: formateurId, isSuspended: true };
    }

    return this.prisma.user.update({
      where: { id: formateurId },
      data: { isSuspended: true },
      select: { id: true, isSuspended: true },
    });
  }

  async unsuspendFormateur(formateurId: number) {
    const formateur = await this.prisma.user.findFirst({
      where: { id: formateurId, role: 'FORMATEUR' },
      select: { id: true, isSuspended: true },
    });

    if (!formateur) {
      throw new NotFoundException('Formateur not found');
    }

    if (!formateur.isSuspended) {
      return { id: formateurId, isSuspended: false };
    }

    return this.prisma.user.update({
      where: { id: formateurId },
      data: { isSuspended: false },
      select: { id: true, isSuspended: true },
    });
  }

  async deleteFormateur(formateurId: number) {
    const formateur = await this.prisma.user.findFirst({
      where: { id: formateurId, role: 'FORMATEUR' },
      select: {
        id: true,
        formations: {
          select: { id: true },
        },
      },
    });

    if (!formateur) {
      throw new NotFoundException('Formateur not found');
    }

    const formationIds = formateur.formations.map((entry) => entry.id);

    await this.prisma.$transaction(async (tx) => {
      await this.deleteFormationTreeByIds(tx, formationIds);

      await tx.invoice.deleteMany({ where: { studentId: formateurId } });
      await tx.enrollment.deleteMany({ where: { studentId: formateurId } });
      await tx.quizSubmission.deleteMany({ where: { studentId: formateurId } });
      await tx.courseResult.deleteMany({ where: { studentId: formateurId } });
      await tx.formationResult.deleteMany({
        where: { studentId: formateurId },
      });

      await tx.user.delete({ where: { id: formateurId } });
    });

    return { message: 'Formateur deleted successfully' };
  }

  async getFormations(query: Record<string, unknown>) {
    const page = this.toNumber(query.page, 1);
    const pageSize = Math.min(this.toNumber(query.pageSize, 10), 100);
    const search = String(query.search || '').trim();
    const status = String(query.status || '').trim().toUpperCase();
    const type = String(query.type || '').trim().toUpperCase();

    const where: Prisma.FormationWhereInput = {
      ...(search
        ? {
            title: { contains: search, mode: 'insensitive' },
          }
        : {}),
      ...(status === 'PUBLISHED'
        ? { published: true }
        : status === 'DRAFT'
          ? { published: false }
          : {}),
      ...(type === 'ONLINE' || type === 'PRESENTIEL'
        ? { type: type as 'ONLINE' | 'PRESENTIEL' }
        : {}),
    };

    const [total, formations] = await this.prisma.$transaction([
      this.prisma.formation.count({ where }),
      this.prisma.formation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          title: true,
          description: true,
          price: true,
          type: true,
          published: true,
          createdAt: true,
          formateur: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          enrollments: {
            select: {
              id: true,
              status: true,
              invoice: {
                select: {
                  amount: true,
                },
              },
            },
          },
          results: {
            select: {
              id: true,
            },
          },
        },
      }),
    ]);

    return {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      items: formations.map((formation) => {
        const approved = formation.enrollments.filter(
          (entry) => entry.status === 'APPROVED',
        ).length;
        const completed = formation.results.length;
        const completionRate =
          approved === 0 ? 0 : this.round2((completed / approved) * 100);
        const revenueGenerated = formation.enrollments.reduce(
          (sum, enrollment) =>
            sum + Number(enrollment.invoice?.amount || 0),
          0,
        );

        return {
          id: formation.id,
          title: formation.title,
          description: formation.description,
          price: formation.price,
          type: formation.type,
          published: formation.published,
          createdAt: formation.createdAt,
          formateur: formation.formateur,
          totalStudentsEnrolled: formation.enrollments.length,
          completionRate,
          revenueGenerated: this.round2(revenueGenerated),
        };
      }),
    };
  }

  async getFormationAnalytics(formationId: number) {
    const formation = await this.prisma.formation.findUnique({
      where: { id: formationId },
      select: {
        id: true,
        title: true,
        description: true,
        type: true,
        price: true,
        published: true,
        publishedAt: true,
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
                phoneNumber: true,
              },
            },
          },
        },
        courses: {
          select: {
            id: true,
            title: true,
            _count: {
              select: {
                quizzes: true,
              },
            },
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

    if (!formation) {
      throw new NotFoundException('Formation not found');
    }

    const courseIds = formation.courses.map((course) => course.id);
    const courseResults =
      courseIds.length === 0
        ? []
        : await this.prisma.courseResult.findMany({
            where: {
              courseId: { in: courseIds },
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

    const totalStudentsEnrolled = formation.enrollments.length;
    const approvedEnrollments = formation.enrollments
      .filter((entry) => entry.status === 'APPROVED')
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
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
        phoneNumber: entry.student.phoneNumber || null,
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
        : this.round2((totalCompletedStudents / totalApprovedStudents) * 100);
    const successRate =
      totalApprovedStudents === 0
        ? 0
        : this.round2((totalSuccessfulStudents / totalApprovedStudents) * 100);

    const courses = formation.courses
      .map((course) => {
        const attempts = (courseResultsByCourseId.get(course.id) || []).filter(
          (result) => approvedStudentIds.has(result.studentId),
        );

        const totalAttempts = attempts.length;
        const passedStudents = attempts.filter((attempt) => attempt.passed)
          .length;
        const failedStudents = totalAttempts - passedStudents;
        const averageScore =
          totalAttempts === 0
            ? 0
            : this.round2(
                attempts.reduce((sum, attempt) => sum + attempt.score, 0) /
                  totalAttempts,
              );

        return {
          id: course.id,
          title: course.title,
          quizCount: course._count?.quizzes || 0,
          passedStudents,
          failedStudents,
          averageScore,
          totalAttempts,
        };
      })
      .sort((a, b) => b.id - a.id);

    return {
      generatedAt: new Date().toISOString(),
      formation: {
        id: formation.id,
        title: formation.title,
        description: formation.description,
        type: formation.type,
        price: formation.price,
        published: formation.published,
        publishedAt: formation.publishedAt,
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
  }

  async getFormationById(formationId: number) {
    const formation = await this.prisma.formation.findUnique({
      where: { id: formationId },
      select: {
        id: true,
        title: true,
        description: true,
        price: true,
        type: true,
        published: true,
        publishedAt: true,
        location: true,
        startDate: true,
        endDate: true,
        createdAt: true,
        formateur: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        enrollments: {
          select: {
            id: true,
            invoice: {
              select: {
                amount: true,
              },
            },
          },
        },
        courses: {
          select: {
            id: true,
            title: true,
            published: true,
            lessons: {
              select: {
                id: true,
                title: true,
                pdfUrl: true,
              },
              orderBy: { id: 'asc' },
            },
            quizzes: {
              select: {
                id: true,
                title: true,
                questions: {
                  select: {
                    id: true,
                    text: true,
                    choices: {
                      select: {
                        id: true,
                        text: true,
                        isCorrect: true,
                      },
                      orderBy: { id: 'asc' },
                    },
                  },
                  orderBy: { id: 'asc' },
                },
              },
              orderBy: { id: 'asc' },
            },
          },
          orderBy: { id: 'asc' },
        },
      },
    });

    if (!formation) {
      throw new NotFoundException('Formation not found');
    }

    const revenueGenerated = formation.enrollments.reduce(
      (sum, enrollment) => sum + Number(enrollment.invoice?.amount || 0),
      0,
    );

    return {
      id: formation.id,
      title: formation.title,
      description: formation.description,
      price: formation.price,
      type: formation.type,
      published: formation.published,
      publishedAt: formation.publishedAt,
      location: formation.location,
      startDate: formation.startDate,
      endDate: formation.endDate,
      createdAt: formation.createdAt,
      formateur: formation.formateur,
      totalStudentsEnrolled: formation.enrollments.length,
      revenueGenerated: this.round2(revenueGenerated),
      courses: formation.courses.map((course) => ({
        id: course.id,
        courseName: course.title,
        title: formation.title,
        description: formation.description,
        published: course.published,
        lessons: course.lessons,
        quizzes: course.quizzes,
      })),
    };
  }

  async updateFormation(
    formationId: number,
    payload: {
      title?: string;
      description?: string;
      price?: number;
      type?: FormationType;
      location?: string | null;
      startDate?: string | null;
      endDate?: string | null;
    },
  ) {
    const formation = await this.prisma.formation.findUnique({
      where: { id: formationId },
      select: { id: true, type: true },
    });

    if (!formation) {
      throw new NotFoundException('Formation not found');
    }

    const data: Prisma.FormationUpdateInput = {};
    let nextType: FormationType = formation.type;

    if (typeof payload.title === 'string') {
      const value = payload.title.trim();
      if (!value) throw new BadRequestException('Title cannot be empty');
      data.title = value;
    }

    if (typeof payload.description === 'string') {
      const value = payload.description.trim();
      if (!value) throw new BadRequestException('Description cannot be empty');
      data.description = value;
    }

    if (payload.price !== undefined) {
      const value = Number(payload.price);
      if (!Number.isFinite(value) || value < 0) {
        throw new BadRequestException('Price must be a valid non-negative number');
      }
      data.price = value;
    }

    if (
      payload.type !== undefined &&
      payload.type !== FormationType.ONLINE &&
      payload.type !== FormationType.PRESENTIEL
    ) {
      throw new BadRequestException('Invalid formation type');
    }

    if (payload.type !== undefined) {
      nextType = payload.type;
      data.type = payload.type;
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'location')) {
      if (payload.location === null) data.location = null;
      else if (typeof payload.location === 'string') {
        data.location = payload.location.trim() || null;
      }
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'startDate')) {
      if (payload.startDate === null || payload.startDate === '') {
        data.startDate = null;
      } else if (typeof payload.startDate === 'string') {
        const parsed = new Date(payload.startDate);
        if (Number.isNaN(parsed.getTime())) {
          throw new BadRequestException('Invalid start date');
        }
        data.startDate = parsed;
      }
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'endDate')) {
      if (payload.endDate === null || payload.endDate === '') {
        data.endDate = null;
      } else if (typeof payload.endDate === 'string') {
        const parsed = new Date(payload.endDate);
        if (Number.isNaN(parsed.getTime())) {
          throw new BadRequestException('Invalid end date');
        }
        data.endDate = parsed;
      }
    }

    if (nextType === FormationType.ONLINE) {
      data.startDate = null;
      data.endDate = null;
      data.location = null;
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException(
        'At least one editable field must be provided',
      );
    }

    return this.prisma.formation.update({
      where: { id: formationId },
      data,
      select: {
        id: true,
        title: true,
        description: true,
        price: true,
        type: true,
        location: true,
        startDate: true,
        endDate: true,
        published: true,
      },
    });
  }

  async updateCourse(
    courseId: number,
    payload: {
      title?: string;
    },
  ) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        formation: {
          select: {
            type: true,
          },
        },
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (course.formation.type !== FormationType.ONLINE) {
      throw new BadRequestException(
        'Only online formation courses can be edited here',
      );
    }

    const data: Prisma.CourseUpdateInput = {};

    if (typeof payload.title === 'string') {
      const value = payload.title.trim();
      if (!value) {
        throw new BadRequestException('Course title cannot be empty');
      }
      data.title = value;
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('At least one editable field is required');
    }

    return this.prisma.course.update({
      where: { id: courseId },
      data,
      select: {
        id: true,
        title: true,
        published: true,
        formationId: true,
      },
    });
  }

  async deleteCourse(courseId: number) {
    return this.prisma.$transaction(async (tx) => {
      const course = await tx.course.findUnique({
        where: { id: courseId },
        include: {
          formation: {
            select: {
              type: true,
            },
          },
          quizzes: {
            select: { id: true },
          },
        },
      });

      if (!course) {
        throw new NotFoundException('Course not found');
      }

      if (course.formation.type !== FormationType.ONLINE) {
        throw new BadRequestException(
          'Only online formation courses can be deleted here',
        );
      }

      const quizIds = course.quizzes.map((entry) => entry.id);
      const questionIds =
        quizIds.length === 0
          ? []
          : (
              await tx.question.findMany({
                where: { quizId: { in: quizIds } },
                select: { id: true },
              })
            ).map((entry) => entry.id);

      await tx.courseResult.deleteMany({
        where: { courseId },
      });

      await tx.lesson.deleteMany({
        where: { courseId },
      });

      if (quizIds.length > 0) {
        await tx.quizSubmission.deleteMany({
          where: { quizId: { in: quizIds } },
        });
      }

      if (questionIds.length > 0) {
        await tx.choice.deleteMany({
          where: { questionId: { in: questionIds } },
        });

        await tx.question.deleteMany({
          where: { id: { in: questionIds } },
        });
      }

      if (quizIds.length > 0) {
        await tx.quiz.deleteMany({
          where: { id: { in: quizIds } },
        });
      }

      await tx.course.delete({
        where: { id: courseId },
      });

      return { message: 'Course deleted successfully' };
    });
  }

  async deleteFormation(formationId: number) {
    const formation = await this.prisma.formation.findUnique({
      where: { id: formationId },
      select: { id: true },
    });

    if (!formation) {
      throw new NotFoundException('Formation not found');
    }

    await this.prisma.$transaction(async (tx) => {
      await this.deleteFormationTreeByIds(tx, [formationId]);
    });

    return { message: 'Formation deleted successfully' };
  }

  async getRevenueOverview(query: Record<string, unknown>) {
    const currentYear = new Date().getFullYear();
    const year = this.toNumber(query.year, currentYear);

    const startOfYear = new Date(year, 0, 1);
    const startOfNextYear = new Date(year + 1, 0, 1);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [totalRevenueAgg, thisMonthRevenueAgg, yearlyInvoices, allInvoices] =
      await this.prisma.$transaction([
        this.prisma.invoice.aggregate({
          _sum: { amount: true },
        }),
        this.prisma.invoice.aggregate({
          where: {
            createdAt: {
              gte: startOfMonth,
            },
          },
          _sum: { amount: true },
        }),
        this.prisma.invoice.findMany({
          where: {
            createdAt: {
              gte: startOfYear,
              lt: startOfNextYear,
            },
          },
          select: {
            amount: true,
            createdAt: true,
          },
        }),
        this.prisma.invoice.findMany({
          select: {
            amount: true,
            createdAt: true,
            enrollment: {
              select: {
                formation: {
                  select: {
                    id: true,
                    title: true,
                  },
                },
              },
            },
          },
        }),
      ]);

    const totalRevenue = Number(totalRevenueAgg._sum.amount || 0);
    const revenueThisMonth = Number(thisMonthRevenueAgg._sum.amount || 0);

    const monthlyRevenue = Array.from({ length: 12 }, (_, index) => ({
      monthIndex: index,
      monthLabel: new Date(year, index, 1).toLocaleString('en-US', {
        month: 'short',
      }),
      revenue: 0,
    }));

    yearlyInvoices.forEach((invoice) => {
      const month = new Date(invoice.createdAt).getMonth();
      monthlyRevenue[month].revenue += Number(invoice.amount || 0);
    });

    const revenuePerFormationMap = new Map<
      number,
      { formationId: number; title: string; revenue: number }
    >();

    allInvoices.forEach((invoice) => {
      const formation = invoice.enrollment?.formation;
      if (!formation) return;

      if (!revenuePerFormationMap.has(formation.id)) {
        revenuePerFormationMap.set(formation.id, {
          formationId: formation.id,
          title: formation.title,
          revenue: 0,
        });
      }

      const current = revenuePerFormationMap.get(formation.id)!;
      current.revenue += Number(invoice.amount || 0);
    });

    const revenuePerFormation = Array.from(
      revenuePerFormationMap.values(),
    )
      .map((entry) => ({
        ...entry,
        revenue: this.round2(entry.revenue),
      }))
      .sort((a, b) => b.revenue - a.revenue);

    const availableYears = Array.from(
      new Set(allInvoices.map((invoice) => new Date(invoice.createdAt).getFullYear())),
    ).sort((a, b) => b - a);

    if (!availableYears.includes(year)) {
      availableYears.unshift(year);
    }

    return {
      year,
      availableYears,
      totalRevenue: this.round2(totalRevenue),
      revenueThisMonth: this.round2(revenueThisMonth),
      revenuePerFormation,
      monthlyRevenue: monthlyRevenue.map((entry) => ({
        ...entry,
        revenue: this.round2(entry.revenue),
      })),
    };
  }

  async getGlobalOverview() {
    const [
      totalUsers,
      totalStudents,
      totalFormateurs,
      totalFormations,
      totalEnrollments,
      revenueAgg,
      formations,
    ] = await this.prisma.$transaction([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { role: 'STUDENT' } }),
      this.prisma.user.count({ where: { role: 'FORMATEUR' } }),
      this.prisma.formation.count(),
      this.prisma.enrollment.count(),
      this.prisma.invoice.aggregate({ _sum: { amount: true } }),
      this.prisma.formation.findMany({
        select: {
          id: true,
          enrollments: {
            where: { status: 'APPROVED' },
            select: { id: true },
          },
          results: {
            select: { id: true },
          },
        },
      }),
    ]);

    const completionRates = formations
      .map((formation) => {
        const approved = formation.enrollments.length;
        if (approved === 0) return null;
        return (formation.results.length / approved) * 100;
      })
      .filter((value): value is number => value != null);

    const averageCompletionRate =
      completionRates.length === 0
        ? 0
        : this.round2(
            completionRates.reduce((sum, value) => sum + value, 0) /
              completionRates.length,
          );

    return {
      totalUsers,
      totalStudents,
      totalFormateurs,
      totalFormations,
      totalEnrollments,
      totalRevenue: this.round2(Number(revenueAgg._sum.amount || 0)),
      averageCompletionRate,
    };
  }

  async getFormateurAnalytics(formateurId: number, query: Record<string, unknown>) {
    const formateur = await this.prisma.user.findFirst({
      where: { id: formateurId, role: 'FORMATEUR' },
      select: { id: true, name: true, email: true },
    });

    if (!formateur) {
      throw new NotFoundException('Formateur not found');
    }

    const currentYear = new Date().getFullYear();
    const year = this.toNumber(query.year, currentYear);
    const startOfYear = new Date(year, 0, 1);
    const startOfNextYear = new Date(year + 1, 0, 1);

    const formations = await this.prisma.formation.findMany({
      where: { formateurId },
      select: { id: true },
    });
    const formationIds = formations.map((entry) => entry.id);

    if (formationIds.length === 0) {
      return {
        formateur,
        year,
        numberOfFormations: 0,
        totalStudentsEnrolled: 0,
        totalRevenueGenerated: 0,
        completionRate: 0,
        monthlyRevenue: Array.from({ length: 12 }, (_, month) => ({
          monthIndex: month,
          monthLabel: new Date(year, month, 1).toLocaleString('en-US', {
            month: 'short',
          }),
          revenue: 0,
        })),
        monthlyEnrollments: Array.from({ length: 12 }, (_, month) => ({
          monthIndex: month,
          monthLabel: new Date(year, month, 1).toLocaleString('en-US', {
            month: 'short',
          }),
          enrollments: 0,
        })),
      };
    }

    const [enrollments, results, invoices, yearlyEnrollments, yearlyInvoices] =
      await this.prisma.$transaction([
        this.prisma.enrollment.findMany({
          where: { formationId: { in: formationIds } },
          select: {
            id: true,
            status: true,
            createdAt: true,
          },
        }),
        this.prisma.formationResult.findMany({
          where: { formationId: { in: formationIds } },
          select: {
            id: true,
            completed: true,
          },
        }),
        this.prisma.invoice.findMany({
          where: {
            enrollment: {
              formationId: { in: formationIds },
            },
          },
          select: {
            amount: true,
            createdAt: true,
          },
        }),
        this.prisma.enrollment.findMany({
          where: {
            formationId: { in: formationIds },
            createdAt: {
              gte: startOfYear,
              lt: startOfNextYear,
            },
          },
          select: {
            createdAt: true,
          },
        }),
        this.prisma.invoice.findMany({
          where: {
            enrollment: {
              formationId: { in: formationIds },
            },
            createdAt: {
              gte: startOfYear,
              lt: startOfNextYear,
            },
          },
          select: {
            amount: true,
            createdAt: true,
          },
        }),
      ]);

    const approved = enrollments.filter(
      (entry) => entry.status === 'APPROVED',
    ).length;
    const completed = results.length;
    const completionRate =
      approved === 0 ? 0 : this.round2((completed / approved) * 100);

    const totalRevenueGenerated = this.round2(
      invoices.reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0),
    );

    const monthlyRevenue = Array.from({ length: 12 }, (_, month) => ({
      monthIndex: month,
      monthLabel: new Date(year, month, 1).toLocaleString('en-US', {
        month: 'short',
      }),
      revenue: 0,
    }));

    yearlyInvoices.forEach((invoice) => {
      const month = new Date(invoice.createdAt).getMonth();
      monthlyRevenue[month].revenue += Number(invoice.amount || 0);
    });

    const monthlyEnrollments = Array.from({ length: 12 }, (_, month) => ({
      monthIndex: month,
      monthLabel: new Date(year, month, 1).toLocaleString('en-US', {
        month: 'short',
      }),
      enrollments: 0,
    }));

    yearlyEnrollments.forEach((enrollment) => {
      const month = new Date(enrollment.createdAt).getMonth();
      monthlyEnrollments[month].enrollments += 1;
    });

    return {
      formateur,
      year,
      numberOfFormations: formationIds.length,
      totalStudentsEnrolled: enrollments.length,
      totalRevenueGenerated,
      completionRate,
      monthlyRevenue: monthlyRevenue.map((entry) => ({
        ...entry,
        revenue: this.round2(entry.revenue),
      })),
      monthlyEnrollments,
    };
  }
}
