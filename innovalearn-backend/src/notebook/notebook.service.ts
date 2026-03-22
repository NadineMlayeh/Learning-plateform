import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { CreateTodoDto } from './dto/create-todo.dto';
import { UpdateTodoDto } from './dto/update-todo.dto';

@Injectable()
export class NotebookService {
  constructor(private prisma: PrismaService) {}

  async getNotes(userId: number) {
    return this.prisma.notebookNote.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createNote(userId: number, dto: CreateNoteDto) {
    const content = dto.content?.trim();
    if (!content) {
      throw new BadRequestException('Note content is required');
    }

    return this.prisma.notebookNote.create({
      data: {
        userId,
        content,
      },
    });
  }

  async updateNote(userId: number, noteId: number, dto: UpdateNoteDto) {
    const note = await this.prisma.notebookNote.findFirst({
      where: { id: noteId, userId },
    });

    if (!note) {
      throw new NotFoundException('Note not found');
    }

    const nextContent =
      typeof dto.content === 'string' ? dto.content.trim() : note.content;

    if (!nextContent) {
      throw new BadRequestException('Note content is required');
    }

    return this.prisma.notebookNote.update({
      where: { id: noteId },
      data: { content: nextContent },
    });
  }

  async deleteNote(userId: number, noteId: number) {
    const result = await this.prisma.notebookNote.deleteMany({
      where: { id: noteId, userId },
    });

    if (result.count === 0) {
      throw new NotFoundException('Note not found');
    }

    return { message: 'Note deleted successfully' };
  }

  async getTodos(userId: number) {
    return this.prisma.notebookTodo.findMany({
      where: { userId },
      orderBy: [{ completed: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async createTodo(userId: number, dto: CreateTodoDto) {
    const content = dto.content?.trim();
    if (!content) {
      throw new BadRequestException('Todo content is required');
    }

    return this.prisma.notebookTodo.create({
      data: {
        userId,
        content,
      },
    });
  }

  async updateTodo(userId: number, todoId: number, dto: UpdateTodoDto) {
    const todo = await this.prisma.notebookTodo.findFirst({
      where: { id: todoId, userId },
    });

    if (!todo) {
      throw new NotFoundException('Todo not found');
    }

    const nextContent =
      typeof dto.content === 'string' ? dto.content.trim() : todo.content;

    if (!nextContent) {
      throw new BadRequestException('Todo content is required');
    }

    return this.prisma.notebookTodo.update({
      where: { id: todoId },
      data: {
        content: nextContent,
        completed:
          typeof dto.completed === 'boolean' ? dto.completed : todo.completed,
      },
    });
  }

  async deleteTodo(userId: number, todoId: number) {
    const result = await this.prisma.notebookTodo.deleteMany({
      where: { id: todoId, userId },
    });

    if (result.count === 0) {
      throw new NotFoundException('Todo not found');
    }

    return { message: 'Todo deleted successfully' };
  }
}

