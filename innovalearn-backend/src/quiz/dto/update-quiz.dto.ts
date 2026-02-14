import { ArrayMinSize, IsArray, IsString } from 'class-validator';

export class UpdateQuizDto {
  @IsString()
  title: string;

  @IsString()
  questionText: string;

  @IsArray()
  @ArrayMinSize(2)
  choices: { text: string; isCorrect: boolean }[];
}
