import {
  Body,
  Controller,
  Delete,
  Get,
  ParseIntPipe,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
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
