import { IsEmail, IsInt, IsString, Max, Min, MinLength } from 'class-validator';

export class CreateContactMessageDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(3)
  noteDescription: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;
}

