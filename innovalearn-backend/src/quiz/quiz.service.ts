import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { CreateQuestionDto } from './dto/create-question.dto';

@Injectable()
export class QuizService {
  constructor(private prisma: PrismaService) {}

  // 1️⃣ Create quiz for course
  async createQuiz(courseId: number, dto: CreateQuizDto, formateurId: number) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: { formation: true },
    });

    if (!course) throw new NotFoundException('Course not found');
    if (course.formation.formateurId !== formateurId)
      throw new ForbiddenException('You cannot add a quiz to this course');

    return this.prisma.quiz.create({
      data: { title: dto.title, courseId },
    });
  }

  // 2️⃣ Add question to quiz
  async addQuestion(quizId: number, dto: CreateQuestionDto, formateurId: number) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: { course: { include: { formation: true } } },
    });

    if (!quiz) throw new NotFoundException('Quiz not found');
    if (quiz.course.formation.formateurId !== formateurId)
      throw new ForbiddenException('You cannot add questions to this quiz');

    return this.prisma.question.create({
      data: {
        text: dto.text,
        quizId,
        choices: {
          create: dto.choices,
        },
      },
      include: { choices: true },
    });
  }

  // 3️⃣ Count quizzes for a course
  async countQuizzes(courseId: number) {
    return this.prisma.quiz.count({ where: { courseId } });
  }
}
