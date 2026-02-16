import { Module } from '@nestjs/common';
import { QuizService } from './quiz.service';
import { QuizController } from './quiz.controller';
import { CertificateService } from '../certificates/certificate.service';

@Module({
  providers: [QuizService, CertificateService],
  controllers: [QuizController]
})
export class QuizModule {}
