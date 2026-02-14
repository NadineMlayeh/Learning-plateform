import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { TestController } from './test/test.controller';
import { FormationModule } from './formation/formation.module';
import { AdminModule } from './admin/admin.module';
import { CourseModule } from './course/course.module';
import { LessonModule } from './lesson/lesson.module';
import { QuizModule } from './quiz/quiz.module';
import { EnrollmentModule } from './enrollment/enrollment.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // 👈 THIS is important
    }),
    PrismaModule,
    UserModule,
    AuthModule,
    FormationModule,
    AdminModule,
    CourseModule,
    LessonModule,
    QuizModule,
    EnrollmentModule,
  ],
  controllers: [TestController],
  providers: [AppService],
})
export class AppModule {}
