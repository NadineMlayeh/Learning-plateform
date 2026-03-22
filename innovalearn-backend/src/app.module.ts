import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailerModule } from '@nestjs-modules/mailer';
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
import { InvoiceModule } from './invoice/invoice.module';
import { NotebookModule } from './notebook/notebook.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        transport: {
          host: config.get<string>('MAIL_HOST') || 'smtp-relay.brevo.com',
          port: Number(config.get<string>('MAIL_PORT') || 587),
          secure: false,
          auth: {
            user: config.get<string>('MAIL_USER'),
            pass: config.get<string>('MAIL_PASS'),
          },
        },
        defaults: {
          from:
            config.get<string>('MAIL_FROM') ||
            'InnovaLearn <no-reply@innovalearn.local>',
        },
      }),
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
    InvoiceModule,
    NotebookModule,
  ],
  controllers: [TestController],
  providers: [AppService],
})
export class AppModule {}
