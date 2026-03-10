import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  ParseIntPipe,
  Param,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { mkdirSync } from 'fs';
import { randomUUID } from 'crypto';
import { CreateFormationDto } from './dto/create-formation.dto';
import { UpdateFormationDto } from './dto/update-formation.dto';
import { FormationService } from './formation.service';

@Controller('formations')
export class FormationController {
  constructor(private formationService: FormationService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.FORMATEUR)
  @Post()
  createFormation(@Body() dto: CreateFormationDto, @Req() req) {
    return this.formationService.create(dto, req.user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.FORMATEUR)
  @Post('thumbnail')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const destinationPath = join(process.cwd(), 'uploads', 'formations');
          mkdirSync(destinationPath, { recursive: true });
          cb(null, destinationPath);
        },
        filename: (_req, file, cb) => {
          const extension = extname(file.originalname || '').toLowerCase();
          const safeExt = extension || '.jpg';
          cb(null, `formation-${Date.now()}-${randomUUID()}${safeExt}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        const isImage = /^image\//i.test(file.mimetype || '');
        cb(
          isImage ? null : new BadRequestException('Only image files are allowed'),
          isImage,
        );
      },
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
    }),
  )
  async uploadFormationThumbnail(@UploadedFile() file) {
    if (!file) {
      throw new BadRequestException('Please select an image file');
    }

    return { url: `/uploads/formations/${file.filename}` };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.FORMATEUR)
  @Get('manage/analytics')
  getManageAnalytics(@Req() req) {
    return this.formationService.getFormateurAnalytics(req.user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.FORMATEUR)
  @Get('manage')
  getManageFormations(@Req() req) {
    return this.formationService.findManageFormations(req.user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.FORMATEUR)
  @Get(':id/manage')
  getManageFormationById(@Param('id', ParseIntPipe) id: number, @Req() req) {
    return this.formationService.findManageFormationById(
      id,
      req.user.userId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.FORMATEUR)
  @Patch(':id')
  updateFormation(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateFormationDto, @Req() req) {
    return this.formationService.updateFormation(id, req.user.userId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.FORMATEUR)
  @Patch(':id/publish')
  publishFormation(@Param('id', ParseIntPipe) id: number, @Req() req) {
    return this.formationService.publishFormation(id, req.user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.FORMATEUR)
  @Delete(':id')
  deletePendingFormation(@Param('id', ParseIntPipe) id: number, @Req() req) {
    return this.formationService.deletePendingFormation(id, req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  getFormations() {
    return this.formationService.findAll();
  }

  // STUDENTS ONLY — view formation details if enrolled & approved
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  @Get(':id/details')
  async getFormationDetails(@Param('id', ParseIntPipe) id: number, @Req() req) {
    return this.formationService.findFormationDetails(id, req.user.userId);
  }
}
