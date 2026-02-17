import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Get,
  Patch,
  Param,
} from '@nestjs/common';
import { FormationService } from './formation.service';
import { CreateFormationDto } from './dto/create-formation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

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
    return this.formationService.getFormateurAnalytics(
      req.user.userId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.FORMATEUR)
  @Get('manage')
  getManageFormations(@Req() req) {
    return this.formationService.findManageFormations(
      req.user.userId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.FORMATEUR)
  @Get(':id/manage')
  getManageFormationById(@Param('id') id: string, @Req() req) {
    return this.formationService.findManageFormationById(
      Number(id),
      req.user.userId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  getFormations() {
    return this.formationService.findAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.FORMATEUR)
  @Patch(':id/publish')
  publishFormation(@Param('id') id: string, @Req() req) {
    return this.formationService.publishFormation(
      Number(id),
      req.user.userId,
    );
  }
  // STUDENTS ONLY — view formation details if enrolled & approved
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.STUDENT)
@Get(':id/details')
async getFormationDetails(@Param('id') id: string, @Req() req) {
  return this.formationService.findFormationDetails(
    Number(id),
    req.user.userId,
  );
}

}
