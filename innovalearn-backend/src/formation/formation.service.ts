import {
  Injectable,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFormationDto } from './dto/create-formation.dto';

@Injectable()
export class FormationService {
  constructor(private prisma: PrismaService) {}

  // 1️⃣ Create formation (DRAFT)
  create(dto: CreateFormationDto, formateurId: number) {
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
        published: false, // explicit & clear
      },
    });
  }

  // 2️⃣ Students see ONLY published formations
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

  // 3️⃣ Explicit publish formation (IMPORTANT RULE)
  async publishFormation(formationId: number, formateurId: number) {
    const formation = await this.prisma.formation.findUnique({
      where: { id: formationId },
      include: { courses: true },
    });

    if (!formation || formation.formateurId !== formateurId) {
      throw new ForbiddenException(
        'You cannot publish this formation',
      );
    }

    if (!formation.courses || formation.courses.length === 0) {
      throw new BadRequestException(
        'Formation must contain at least one course',
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
}
