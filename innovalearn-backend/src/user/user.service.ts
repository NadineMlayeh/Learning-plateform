import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { Prisma } from '@prisma/client';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

async create(dto: CreateUserDto) {
  const hashedPassword = await bcrypt.hash(dto.password, 10);
  const hasDateOfBirth = Boolean(dto.dateOfBirth);

  return this.prisma.user.create({
    data: {
      name: dto.name,
      email: dto.email,
      password: hashedPassword,
      role: dto.role,
      formateurStatus: dto.formateurStatus || null,
      bio: dto.bio?.trim() || null,
      dateOfBirth: hasDateOfBirth ? new Date(dto.dateOfBirth as string) : null,
    },
  });
}

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        formateurStatus: true,
        createdAt: true,
        profileImageUrl: true,
        bio: true,
        dateOfBirth: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(userId: number) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        formateurStatus: true,
        createdAt: true,
        profileImageUrl: true,
        bio: true,
        dateOfBirth: true,
      },
    });
  }

  async updateProfileImage(userId: number, profileImageUrl: string) {
    const current = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { profileImageUrl: true },
    });

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { profileImageUrl },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        formateurStatus: true,
        createdAt: true,
        profileImageUrl: true,
        bio: true,
        dateOfBirth: true,
      },
    });

    if (
      current?.profileImageUrl &&
      current.profileImageUrl.startsWith('/uploads/avatars/') &&
      current.profileImageUrl !== profileImageUrl
    ) {
      const oldFilePath = join(
        process.cwd(),
        current.profileImageUrl.replace(/^\//, ''),
      );

      if (existsSync(oldFilePath)) {
        try {
          unlinkSync(oldFilePath);
        } catch {
          // keep upload update successful even if old file cleanup fails
        }
      }
    }

    return updated;
  }

  async updateProfile(
    userId: number,
    payload: {
      name?: string;
      bio?: string | null;
      dateOfBirth?: string | null;
    },
  ) {
    const data: Prisma.UserUpdateInput = {};

    if (typeof payload.name === 'string') {
      const trimmed = payload.name.trim();
      if (!trimmed) {
        throw new BadRequestException('Name cannot be empty');
      }
      data.name = trimmed;
    }

    if (payload.bio !== undefined) {
      if (payload.bio == null) {
        data.bio = null;
      } else if (typeof payload.bio === 'string') {
        const trimmedBio = payload.bio.trim();
        data.bio = trimmedBio || null;
      }
    }

    if (payload.dateOfBirth !== undefined) {
      if (payload.dateOfBirth == null || payload.dateOfBirth === '') {
        data.dateOfBirth = null;
      } else {
        const parsed = new Date(payload.dateOfBirth);
        if (Number.isNaN(parsed.getTime())) {
          throw new BadRequestException('Invalid date of birth');
        }
        data.dateOfBirth = parsed;
      }
    }

    if (!Object.keys(data).length) {
      throw new BadRequestException(
        'At least one field is required (name, bio, dateOfBirth)',
      );
    }

    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        formateurStatus: true,
        createdAt: true,
        profileImageUrl: true,
        bio: true,
        dateOfBirth: true,
      },
    });
  }
}
