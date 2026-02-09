import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './dto/register.dto';
import { Role } from '@prisma/client';



@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user && await bcrypt.compare(password, user.password)) {
      return user;
    }
    return null;
  }

  async login(user: any) {
    const payload = { sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
async register(dto: RegisterDto) {
  const hashedPassword = await bcrypt.hash(dto.password, 10);

  return this.prisma.user.create({
    data: {
      email: dto.email,
      password: hashedPassword,
      name: dto.name,
      role: dto.role ?? Role.STUDENT,
      formateurStatus:
        dto.role === Role.FORMATEUR ? 'PENDING' : null,
    },
  });
}


}
