import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateFormationDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;
}
