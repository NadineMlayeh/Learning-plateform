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
import { CertificateService } from '../certificates/certificate.service';

@Injectable()
export class QuizService {
  constructor(
    private prisma: PrismaService,
    private certificateService: CertificateService,
  ) {}

  private async ensureStudentCanAccessFormation(
    studentId: number,
    formationId: number,
  ) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: {
        studentId_formationId: { studentId, formationId },
      },
    });

    if (!enrollment || enrollment.status !== 'APPROVED') {
      throw new ForbiddenException(
        'You are not approved for this formation',
      );
    }
  }

  private async getCourseReviewData(courseId: number, studentId: number) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        formation: true,
        quizzes: {
          include: {
            questions: {
              include: {
                choices: true,
              },
            },
          },
        },
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const allQuestions = course.quizzes.flatMap((quiz) => quiz.questions);
    const totalQuestions = allQuestions.length;

    const submissions = await this.prisma.quizSubmission.findMany({
      where: {
        studentId,
        questionId: { in: allQuestions.map((q) => q.id) },
      },
      include: { choice: true },
    });

    const submissionByQuestion = new Map(
      submissions.map((submission) => [submission.questionId, submission]),
    );

    const correctAnswers = allQuestions.filter((question) => {
      const submission = submissionByQuestion.get(question.id);
      return Boolean(submission?.choice?.isCorrect);
    }).length;

    const requiredCorrect = Math.floor(totalQuestions / 2) + 1;
    const score =
      totalQuestions > 0
        ? (correctAnswers / totalQuestions) * 100
        : 0;
    const passed = totalQuestions > 0 && correctAnswers >= requiredCorrect;

    const review = course.quizzes.map((quiz) => ({
      quizId: quiz.id,
      quizTitle: quiz.title,
      questions: quiz.questions.map((question) => {
        const selectedSubmission = submissionByQuestion.get(question.id);
        const selectedChoiceId = selectedSubmission?.choiceId ?? null;
        const correctChoice =
          question.choices.find((choice) => choice.isCorrect) ?? null;
        const selectedChoice =
          question.choices.find((choice) => choice.id === selectedChoiceId) ??
          null;

        return {
          questionId: question.id,
          questionText: question.text,
          selectedChoiceId,
          selectedChoiceText: selectedChoice?.text ?? null,
          correctChoiceId: correctChoice?.id ?? null,
          correctChoiceText: correctChoice?.text ?? null,
          isCorrect: Boolean(selectedSubmission?.choice?.isCorrect),
          choices: question.choices.map((choice) => ({
            id: choice.id,
            text: choice.text,
            isCorrect: choice.isCorrect,
          })),
        };
      }),
    }));

    return {
      course,
      totalQuestions,
      correctAnswers,
      requiredCorrect,
      score,
      passed,
      review,
    };
  }

  private async checkFormationCompletion(
    studentId: number,
    formationId: number,
  ) {
    const totalCourses = await this.prisma.course.count({
      where: {
        formationId,
        published: true,
      },
    });

    if (totalCourses === 0) {
      return {
        allCoursesFinalized: false,
        completed: false,
        certificateUrl: null,
      };
    }

    const totalFinalizedCourses = await this.prisma.courseResult.count({
      where: {
        studentId,
        course: { formationId },
      },
    });

    const allCoursesFinalized = totalFinalizedCourses === totalCourses;

    if (!allCoursesFinalized) {
      return {
        allCoursesFinalized: false,
        completed: false,
        certificateUrl: null,
      };
    }

    const passedCourses = await this.prisma.courseResult.count({
      where: {
        studentId,
        passed: true,
        course: { formationId },
      },
    });

    const completed = passedCourses === totalCourses;

    const existingResult = await this.prisma.formationResult.findUnique({
      where: {
        studentId_formationId: { studentId, formationId },
      },
    });

    let certificateUrl: string | null = null;

    if (completed) {
      if (existingResult?.certificateUrl) {
        certificateUrl = existingResult.certificateUrl;
      } else {
        const [formation, student] = await Promise.all([
          this.prisma.formation.findUnique({ where: { id: formationId } }),
          this.prisma.user.findUnique({ where: { id: studentId } }),
        ]);

        if (!formation) {
          throw new NotFoundException('Formation not found');
        }
        if (!student) {
          throw new NotFoundException('Student not found');
        }

        certificateUrl =
          await this.certificateService.generateCertificate(
            student.name,
            formation.title,
          );
      }
    }

    await this.prisma.formationResult.upsert({
      where: {
        studentId_formationId: { studentId, formationId },
      },
      update: {
        completed,
        certificateUrl: completed ? certificateUrl : null,
      },
      create: {
        studentId,
        formationId,
        completed,
        certificateUrl: completed ? certificateUrl : null,
      },
    });

    return {
      allCoursesFinalized: true,
      completed,
      certificateUrl: completed ? certificateUrl : null,
    };
  }

  async finalizeQuiz(studentId: number, quizId: number) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        course: {
          include: { formation: true },
        },
      },
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    await this.ensureStudentCanAccessFormation(
      studentId,
      quiz.course.formationId,
    );

    const existingResult = await this.prisma.courseResult.findUnique({
      where: {
        studentId_courseId: {
          studentId,
          courseId: quiz.courseId,
        },
      },
    });

    const reviewData = await this.getCourseReviewData(
      quiz.courseId,
      studentId,
    );

    if (reviewData.totalQuestions === 0) {
      throw new BadRequestException(
        'This course has no quiz questions to finalize',
      );
    }

    const answeredQuestions = reviewData.review
      .flatMap((quizReview) => quizReview.questions)
      .filter((question) => question.selectedChoiceId != null).length;

    if (answeredQuestions < reviewData.totalQuestions && !existingResult) {
      throw new BadRequestException(
        'You must answer all quiz questions before finalizing',
      );
    }

    if (existingResult) {
      const formationStatus = await this.checkFormationCompletion(
        studentId,
        reviewData.course.formationId,
      );

      return {
        score: existingResult.score,
        passed: existingResult.passed,
        correctAnswers: reviewData.correctAnswers,
        totalQuestions: reviewData.totalQuestions,
        requiredCorrect: reviewData.requiredCorrect,
        badgeUrl: existingResult.badgeUrl,
        review: reviewData.review,
        locked: true,
        formationResult: formationStatus,
      };
    }

    let badgeUrl: string | null = null;

    if (reviewData.passed) {
      const student = await this.prisma.user.findUnique({
        where: { id: studentId },
      });

      if (!student) {
        throw new NotFoundException('Student not found');
      }

      badgeUrl = await this.certificateService.generateBadge(
        student.name,
        reviewData.course.formation.title,
        reviewData.course.title,
      );
    }

    const courseResult = await this.prisma.courseResult.create({
      data: {
        studentId,
        courseId: reviewData.course.id,
        score: reviewData.score,
        passed: reviewData.passed,
        badgeUrl,
      },
    });

    const formationStatus = await this.checkFormationCompletion(
      studentId,
      reviewData.course.formationId,
    );

    return {
      score: courseResult.score,
      passed: courseResult.passed,
      correctAnswers: reviewData.correctAnswers,
      totalQuestions: reviewData.totalQuestions,
      requiredCorrect: reviewData.requiredCorrect,
      badgeUrl: courseResult.badgeUrl,
      review: reviewData.review,
      locked: true,
      formationResult: formationStatus,
    };
  }

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

  async submitAnswer(
    studentId: number,
    quizId: number,
    questionId: number,
    choiceId: number,
  ) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: { course: { include: { formation: true } } },
    });

    if (!quiz) throw new NotFoundException('Quiz not found');

    const existingResult = await this.prisma.courseResult.findUnique({
      where: {
        studentId_courseId: {
          studentId,
          courseId: quiz.courseId,
        },
      },
    });

    if (existingResult) {
      throw new BadRequestException(
        'Course quiz answers are finalized and cannot be changed',
      );
    }

    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
      include: { quiz: true },
    });
    if (!question || question.quizId !== quizId) {
      throw new NotFoundException(
        'Question does not belong to this quiz',
      );
    }

    const choice = await this.prisma.choice.findUnique({
      where: { id: choiceId },
    });
    if (!choice || choice.questionId !== questionId) {
      throw new NotFoundException(
        'Choice does not belong to this question',
      );
    }

    await this.ensureStudentCanAccessFormation(
      studentId,
      quiz.course.formationId,
    );

    return this.prisma.quizSubmission.upsert({
      where: { studentId_questionId: { studentId, questionId } },
      update: { choiceId },
      create: { studentId, quizId, questionId, choiceId },
    });
  }

  async getStudentAnswers(studentId: number, quizId: number) {
    return this.prisma.quizSubmission.findMany({
      where: { studentId, quizId },
      include: { choice: true, question: true },
    });
  }
}
