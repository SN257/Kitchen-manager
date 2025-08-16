import { IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateSectionDto {
  @IsString()
  sectionName: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  eventId: number;

  @IsNumber()
  rows: number;

  @IsNumber()
  columns: number;
}
