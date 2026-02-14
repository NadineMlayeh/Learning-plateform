import { IsString } from 'class-validator';

export class CreateQuizDto {
  @IsString()
  title: string;
}
