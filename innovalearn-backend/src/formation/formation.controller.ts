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

  // FORMATEUR ONLY
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.FORMATEUR)
  @Post()
  createFormation(@Body() dto: CreateFormationDto, @Req() req) {
    return this.formationService.create(dto, req.user.userId);
  }

  // STUDENTS (published only)
  @UseGuards(JwtAuthGuard)
  @Get()
  getFormations() {
    return this.formationService.findAll();
  }

  // FORMATEUR publishes formation
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.FORMATEUR)
  @Patch(':id/publish')
  publishFormation(@Param('id') id: string, @Req() req) {
    return this.formationService.publishFormation(
      Number(id),
      req.user.userId,
    );
  }
}
