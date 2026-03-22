import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { NotebookService } from './notebook.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { CreateTodoDto } from './dto/create-todo.dto';
import { UpdateTodoDto } from './dto/update-todo.dto';

@Controller('notebook')
@UseGuards(JwtAuthGuard)
export class NotebookController {
  constructor(private readonly notebookService: NotebookService) {}

  @Get('notes')
  getNotes(@Req() req) {
    return this.notebookService.getNotes(req.user.userId);
  }

  @Post('notes')
  createNote(@Req() req, @Body() dto: CreateNoteDto) {
    return this.notebookService.createNote(req.user.userId, dto);
  }

  @Put('notes/:id')
  updateNote(
    @Req() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateNoteDto,
  ) {
    return this.notebookService.updateNote(req.user.userId, id, dto);
  }

  @Delete('notes/:id')
  deleteNote(@Req() req, @Param('id', ParseIntPipe) id: number) {
    return this.notebookService.deleteNote(req.user.userId, id);
  }

  @Get('todos')
  getTodos(@Req() req) {
    return this.notebookService.getTodos(req.user.userId);
  }

  @Post('todos')
  createTodo(@Req() req, @Body() dto: CreateTodoDto) {
    return this.notebookService.createTodo(req.user.userId, dto);
  }

  @Put('todos/:id')
  updateTodo(
    @Req() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTodoDto,
  ) {
    return this.notebookService.updateTodo(req.user.userId, id, dto);
  }

  @Delete('todos/:id')
  deleteTodo(@Req() req, @Param('id', ParseIntPipe) id: number) {
    return this.notebookService.deleteTodo(req.user.userId, id);
  }
}

