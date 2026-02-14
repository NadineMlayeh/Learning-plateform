import { IsString, IsArray, ArrayMinSize } from 'class-validator';

export class CreateQuestionDto {
  @IsString()
  text: string;

  @IsArray()
  @ArrayMinSize(2) // At least 2 choices
  choices: { text: string; isCorrect: boolean }[];
}
