import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { EnrollmentModule } from '../enrollment/enrollment.module';

@Module({
  imports: [EnrollmentModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
