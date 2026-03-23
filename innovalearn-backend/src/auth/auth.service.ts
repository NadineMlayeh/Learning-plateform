import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './dto/register.dto';
import { Role } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private mailerService: MailerService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) return null;

    const passwordValid = await bcrypt.compare(password, user.password);
    if (!passwordValid) return null;

    if (user.isSuspended) {
      throw new UnauthorizedException('Your account has been suspended');
    }

    if (user.role === Role.FORMATEUR) {
      if (user.formateurStatus === 'PENDING') {
        throw new UnauthorizedException(
          'Your formateur request is still pending admin approval',
        );
      }

      if (user.formateurStatus === 'REJECTED') {
        throw new UnauthorizedException(
          'Your formateur request has been rejected by admin',
        );
      }

      if (user.formateurStatus !== 'APPROVED') {
        throw new UnauthorizedException(
          'Your formateur account is not approved by admin',
        );
      }
    }

    return user;
  }

  async login(user: any) {
    const payload = { sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async register(dto: RegisterDto) {
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const hasDateOfBirth = Boolean(dto.dateOfBirth);

    return this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        name: dto.name,
        phoneNumber: dto.phoneNumber.trim(),
        dateOfBirth: hasDateOfBirth ? new Date(dto.dateOfBirth as string) : null,
        role: dto.role ?? Role.STUDENT,
        formateurStatus: dto.role === Role.FORMATEUR ? 'PENDING' : null,
      },
    });
  }

  async requestPasswordReset(emailInput?: string) {
    const email = String(emailInput || '').trim();
    const genericResponse = {
      success: true,
      message:
        'If this email exists, a password reset link has been sent.',
    };

    if (!email) return genericResponse;

    const user = await this.prisma.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: 'insensitive',
        },
      },
      select: { id: true, email: true },
    });

    if (!user) return genericResponse;

    const rawToken = randomBytes(32).toString('hex');
    const hashedToken = createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await this.prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    });

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token: hashedToken,
        expiresAt,
      },
    });

    const resetUrl = this.buildResetUrl(rawToken);
    await this.dispatchPasswordResetEmail(user.email, resetUrl);

    return genericResponse;
  }

  async resetPassword(
    tokenInput?: string,
    newPasswordInput?: string,
    confirmPasswordInput?: string,
  ) {
    const token = String(tokenInput || '').trim();
    const newPassword = String(newPasswordInput || '');
    const confirmPassword = String(confirmPasswordInput || '');

    if (!token || !newPassword || !confirmPassword) {
      throw new BadRequestException(
        'Token, new password and confirmation are required',
      );
    }

    if (newPassword !== confirmPassword) {
      throw new BadRequestException('New passwords do not match');
    }

    if (newPassword.length < 6) {
      throw new BadRequestException(
        'New password must be at least 6 characters long',
      );
    }

    const hashedToken = createHash('sha256').update(token).digest('hex');

    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { token: hashedToken },
      select: { id: true, userId: true, expiresAt: true },
    });

    if (!resetToken) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    if (resetToken.expiresAt.getTime() < Date.now()) {
      await this.prisma.passwordResetToken.delete({
        where: { id: resetToken.id },
      });
      throw new BadRequestException('Invalid or expired reset token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: resetToken.userId },
      select: { password: true },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const sameAsCurrent = await bcrypt.compare(newPassword, user.password);
    if (sameAsCurrent) {
      throw new BadRequestException(
        'New password must be different from current password',
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetToken.userId },
        data: { password: hashedPassword },
      }),
      this.prisma.passwordResetToken.delete({
        where: { id: resetToken.id },
      }),
    ]);

    return {
      success: true,
      message: 'Password reset successful. You can now log in.',
    };
  }

  async validateResetToken(tokenInput?: string) {
    const token = String(tokenInput || '').trim();
    if (!token) {
      return {
        valid: false,
        message: 'Invalid or expired reset token',
      };
    }

    const hashedToken = createHash('sha256').update(token).digest('hex');
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { token: hashedToken },
      select: { id: true, expiresAt: true },
    });

    if (!resetToken) {
      return {
        valid: false,
        message: 'Invalid or expired reset token',
      };
    }

    if (resetToken.expiresAt.getTime() < Date.now()) {
      await this.prisma.passwordResetToken.delete({
        where: { id: resetToken.id },
      });
      return {
        valid: false,
        message: 'This reset link has expired. Please request a new one.',
      };
    }

    return {
      valid: true,
    };
  }

  private buildResetUrl(rawToken: string): string {
    const configured = String(
      this.configService.get('FRONTEND_RESET_PASSWORD_URL') ||
        'http://localhost:5173/reset-password',
    ).trim();

    if (configured.includes('{token}')) {
      return configured.replace('{token}', encodeURIComponent(rawToken));
    }

    const separator = configured.includes('?') ? '&' : '?';
    return `${configured}${separator}token=${encodeURIComponent(rawToken)}`;
  }

  private async dispatchPasswordResetEmail(
    email: string,
    resetUrl: string,
  ): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'InnovaLearn - Reset your password',
        text: `You requested a password reset.\n\nUse this link to reset your password (valid for 15 minutes):\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #0f2c5a;">
            <h2 style="margin: 0 0 12px;">Reset your password</h2>
            <p style="margin: 0 0 12px;">
              You requested a password reset for your InnovaLearn account.
            </p>
            <p style="margin: 0 0 14px;">
              Click the link below (valid for <strong>15 minutes</strong>):
            </p>
            <p style="margin: 0 0 18px;">
              <a href="${resetUrl}" target="_blank" rel="noopener noreferrer">${resetUrl}</a>
            </p>
            <p style="margin: 0; color: #4d6488;">
              If you did not request this, you can safely ignore this email.
            </p>
          </div>
        `,
      });
    } catch (error) {
      console.error(
        `[Auth] Failed to send password reset email to ${email}`,
        error,
      );
    }
  }
}
