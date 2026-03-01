import {
  Controller,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
  Get,
} from '@nestjs/common';
import { QuizService } from './quiz.service';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller()
export class QuizController {
  constructor(private quizService: QuizService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.FORMATEUR)
  @Post('courses/:courseId/quizzes')
  createQuiz(
    @Param('courseId') courseId: string,
    @Body() dto: CreateQuizDto,
    @Req() req,
  ) {
    return this.quizService.createQuiz(
      Number(courseId),
      dto,
      req.user.userId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.FORMATEUR)
  @Post('quizzes/:quizId/questions')
  addQuestion(
    @Param('quizId') quizId: string,
    @Body() dto: CreateQuestionDto,
    @Req() req,
  ) {
    return this.quizService.addQuestion(
      Number(quizId),
      dto,
      req.user.userId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.FORMATEUR)
  @Patch('quizzes/:quizId')
  updateQuiz(
    @Param('quizId') quizId: string,
    @Body() dto: UpdateQuizDto,
    @Req() req,
  ) {
    return this.quizService.updateQuiz(
      Number(quizId),
      dto,
      req.user.userId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.FORMATEUR)
  @Delete('quizzes/:quizId')
  deleteQuiz(@Param('quizId') quizId: string, @Req() req) {
    return this.quizService.deleteQuiz(
      Number(quizId),
      req.user.userId,
    );
  }

  @Get('courses/:courseId/quizzes/count')
  countQuizzes(@Param('courseId') courseId: string) {
    return this.quizService.countQuizzes(Number(courseId));
  }
  // STUDENT: submit answer
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  @Post('quizzes/:quizId/answer/:questionId')
  submitAnswer(
    @Param('quizId') quizId: string,
    @Param('questionId') questionId: string,
    @Body('choiceId') choiceId: number,
    @Req() req,
  ) {
    return this.quizService.submitAnswer(
      req.user.userId,
      Number(quizId),
      Number(questionId),
      choiceId,
    );
  }

  // STUDENT: get their answers (optional)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  @Get('quizzes/:quizId/my-answers')
  getMyAnswers(@Param('quizId') quizId: string, @Req() req) {
    return this.quizService.getStudentAnswers(req.user.userId, Number(quizId));
  }
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  @Post('quizzes/:quizId/finalize')
  finalizeQuiz(@Param('quizId') quizId: string, @Req() req) {
    return this.quizService.finalizeQuiz(
      req.user.userId,
      Number(quizId),
    );
  }

}
