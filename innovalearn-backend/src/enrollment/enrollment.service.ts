import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EnrollmentService {
  constructor(private prisma: PrismaService) {}

  async enroll(studentId: number, formationId: number) {
    // 1️⃣ Check formation exists & is published
    const formation = await this.prisma.formation.findUnique({
      where: { id: formationId },
    });
    if (!formation || !formation.published)
      throw new BadRequestException('Formation not available for enrollment');

    // 2️⃣ Check if student already enrolled
    const existing = await this.prisma.enrollment.findUnique({
      where: { studentId_formationId: { studentId, formationId } },
    });
    if (existing)
      throw new BadRequestException('Student already enrolled');

    // 3️⃣ Create enrollment
    return this.prisma.enrollment.create({
      data: { studentId, formationId },
    });
  }

  async getEnrollments(studentId: number) {
    return this.prisma.enrollment.findMany({
      where: { studentId },
      include: { formation: true },
    });
  }
}
