import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';

@Injectable()
export class QuizService {
  constructor(private prisma: PrismaService) {}

  async createQuiz(
    courseId: number,
    dto: CreateQuizDto,
    formateurId: number,
  ) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: { formation: true },
    });

    if (!course) throw new NotFoundException('Course not found');

    if (course.formation.formateurId !== formateurId) {
      throw new ForbiddenException(
        'You cannot add a quiz to this course',
      );
    }

    if (course.formation.published || course.published) {
      throw new BadRequestException(
        'Published content cannot be altered',
      );
    }

    return this.prisma.quiz.create({
      data: { title: dto.title, courseId },
    });
  }

  async addQuestion(
    quizId: number,
    dto: CreateQuestionDto,
    formateurId: number,
  ) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: { course: { include: { formation: true } } },
    });

    if (!quiz) throw new NotFoundException('Quiz not found');

    if (quiz.course.formation.formateurId !== formateurId) {
      throw new ForbiddenException(
        'You cannot add questions to this quiz',
      );
    }

    if (quiz.course.formation.published || quiz.course.published) {
      throw new BadRequestException(
        'Published content cannot be altered',
      );
    }

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

  async updateQuiz(
    quizId: number,
    dto: UpdateQuizDto,
    formateurId: number,
  ) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        course: { include: { formation: true } },
        questions: {
          include: {
            choices: true,
          },
        },
      },
    });

    if (!quiz) throw new NotFoundException('Quiz not found');

    if (quiz.course.formation.formateurId !== formateurId) {
      throw new ForbiddenException('You cannot edit this quiz');
    }

    if (quiz.course.formation.published || quiz.course.published) {
      throw new BadRequestException(
        'Published content cannot be altered',
      );
    }

    const normalizedChoices = dto.choices
      .map((choice) => ({
        text: choice.text?.trim(),
        isCorrect: Boolean(choice.isCorrect),
      }))
      .filter((choice) => choice.text);

    if (dto.questionText.trim().length === 0) {
      throw new BadRequestException('Question is required');
    }

    if (normalizedChoices.length < 2) {
      throw new BadRequestException(
        'At least 2 choices are required',
      );
    }

    const correctCount = normalizedChoices.filter(
      (choice) => choice.isCorrect,
    ).length;

    if (correctCount !== 1) {
      throw new BadRequestException(
        'Exactly one correct choice is required',
      );
    }

    const primaryQuestion = quiz.questions[0];

    await this.prisma.quiz.update({
      where: { id: quizId },
      data: { title: dto.title },
    });

    if (primaryQuestion) {
      await this.prisma.question.update({
        where: { id: primaryQuestion.id },
        data: { text: dto.questionText },
      });

      await this.prisma.choice.deleteMany({
        where: { questionId: primaryQuestion.id },
      });

      await this.prisma.choice.createMany({
        data: normalizedChoices.map((choice) => ({
          text: choice.text,
          isCorrect: choice.isCorrect,
          questionId: primaryQuestion.id,
        })),
      });
    } else {
      await this.prisma.question.create({
        data: {
          text: dto.questionText,
          quizId,
          choices: {
            create: normalizedChoices,
          },
        },
      });
    }

    return this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: {
          include: {
            choices: true,
          },
        },
      },
    });
  }

  async countQuizzes(courseId: number) {
    return this.prisma.quiz.count({ where: { courseId } });
  }
}
