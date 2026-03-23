import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
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
      phoneNumber: dto.phoneNumber?.trim() || null,
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
        phoneNumber: true,
        role: true,
        formateurStatus: true,
        hasSeenTour: true,
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
        phoneNumber: true,
        role: true,
        formateurStatus: true,
        hasSeenTour: true,
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
        phoneNumber: true,
        role: true,
        formateurStatus: true,
        hasSeenTour: true,
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
      phoneNumber?: string | null;
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

    if (payload.phoneNumber !== undefined) {
      if (payload.phoneNumber == null || payload.phoneNumber === '') {
        data.phoneNumber = null;
      } else if (typeof payload.phoneNumber === 'string') {
        const trimmedPhone = payload.phoneNumber.trim();
        if (!/^[+]?[\d\s\-()]{8,20}$/.test(trimmedPhone)) {
          throw new BadRequestException('Invalid phone number format');
        }
        data.phoneNumber = trimmedPhone;
      }
    }

    if (!Object.keys(data).length) {
      throw new BadRequestException(
        'At least one field is required (name, bio, dateOfBirth, phoneNumber)',
      );
    }

    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        role: true,
        formateurStatus: true,
        hasSeenTour: true,
        createdAt: true,
        profileImageUrl: true,
        bio: true,
        dateOfBirth: true,
      },
    });
  }

  async changePassword(
    userId: number,
    payload: ChangePasswordDto,
  ): Promise<{ success: true; message: string }> {
    const email = String(payload?.email || '').trim().toLowerCase();
    const oldPassword = String(payload?.oldPassword || '');
    const newPassword = String(payload?.newPassword || '');
    const confirmNewPassword = String(payload?.confirmNewPassword || '');

    if (!email || !oldPassword || !newPassword || !confirmNewPassword) {
      throw new BadRequestException(
        'Email, old password, new password and password confirmation are required',
      );
    }

    if (newPassword.length < 6) {
      throw new BadRequestException(
        'New password must be at least 6 characters long',
      );
    }

    if (newPassword !== confirmNewPassword) {
      throw new BadRequestException('New passwords do not match');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, password: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (String(user.email || '').toLowerCase() !== email) {
      throw new BadRequestException('Email does not match your account');
    }

    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isOldPasswordValid) {
      throw new BadRequestException('Old password is incorrect');
    }

    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      throw new BadRequestException(
        'New password must be different from old password',
      );
    }

    const password = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { password },
    });

    return { success: true, message: 'Password updated successfully' };
  }

  async markTourSeen(userId: number): Promise<{ success: true; hasSeenTour: true }> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { hasSeenTour: true },
    });

    return { success: true, hasSeenTour: true };
  }
}
