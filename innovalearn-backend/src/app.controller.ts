import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';


@Controller()
export class AppController {
  @Get('health')
  getHealth() {
    return { status: 'ok' };
  }

  @Get('protected')
  @UseGuards(JwtAuthGuard)
  getProtected() {
    return { message: 'You are authenticated!' };
  }
}
