import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContactMessageDto } from './dto/create-contact-message.dto';

const DEFAULT_REVIEWS_PAGE_SIZE = 5;
const MAX_REVIEWS_PAGE_SIZE = 50;

@Injectable()
export class ContactService {
  constructor(private prisma: PrismaService) {}

  async createMessage(dto: CreateContactMessageDto) {
    const email = dto.email?.trim().toLowerCase();
    const noteDescription = dto.noteDescription?.trim();
    const rating = Number(dto.rating);

    if (!email) {
      throw new BadRequestException('Email is required');
    }
    if (!noteDescription) {
      throw new BadRequestException('Note description is required');
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    return this.prisma.contactMessage.create({
      data: {
        email,
        noteDescription,
        rating,
      },
    });
  }

  async getAdminReviews(query: {
    page?: string;
    pageSize?: string;
    search?: string;
  }) {
    const page = Math.max(1, Number.parseInt(query.page ?? '1', 10) || 1);
    const requestedPageSize =
      Number.parseInt(query.pageSize ?? `${DEFAULT_REVIEWS_PAGE_SIZE}`, 10) ||
      DEFAULT_REVIEWS_PAGE_SIZE;
    const pageSize = Math.min(
      MAX_REVIEWS_PAGE_SIZE,
      Math.max(1, requestedPageSize),
    );
    const search = query.search?.trim() || '';

    const where = search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' as const } },
            {
              noteDescription: {
                contains: search,
                mode: 'insensitive' as const,
              },
            },
          ],
        }
      : undefined;

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.contactMessage.count({ where }),
      this.prisma.contactMessage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      rows,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }
}
