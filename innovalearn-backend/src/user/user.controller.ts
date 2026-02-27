import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { mkdirSync } from 'fs';
import { randomUUID } from 'crypto';

@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.userService.create(dto);
  }

  @Get()
  findAll() {
    return this.userService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  findMe(@Req() req) {
    return this.userService.findById(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  async updateMe(
    @Req() req,
    @Body()
    body: {
      name?: string;
      bio?: string | null;
      dateOfBirth?: string | null;
    },
  ) {
    if (!['STUDENT', 'FORMATEUR'].includes(String(req.user.role || ''))) {
      throw new ForbiddenException(
        'Only students and formateurs can update profile details',
      );
    }

    return this.userService.updateProfile(req.user.userId, body || {});
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me/avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const destinationPath = join(process.cwd(), 'uploads', 'avatars');
          mkdirSync(destinationPath, { recursive: true });
          cb(null, destinationPath);
        },
        filename: (_req, file, cb) => {
          const extension = extname(file.originalname || '').toLowerCase();
          const safeExt = extension || '.jpg';
          cb(null, `avatar-${Date.now()}-${randomUUID()}${safeExt}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        const isImage = /^image\//i.test(file.mimetype || '');
        cb(isImage ? null : new BadRequestException('Only image files are allowed'), isImage);
      },
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
    }),
  )
  async updateMyAvatar(@Req() req, @UploadedFile() file) {
    if (!file) {
      throw new BadRequestException('Please select an image file');
    }

    if (!['STUDENT', 'FORMATEUR'].includes(String(req.user.role || ''))) {
      throw new ForbiddenException(
        'Only students and formateurs can update profile pictures',
      );
    }

    const profileImageUrl = `/uploads/avatars/${file.filename}`;
    return this.userService.updateProfileImage(req.user.userId, profileImageUrl);
  }
}
