import { IsNumber, IsOptional, IsArray, ValidateNested, ArrayMinSize, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

class FoodPlanItem {
  @IsString()
  foodName: string;

  @IsNumber()
  @Min(0.1, { message: 'Fill weight must be at least 0.1 kg' })
  fillWeightKg: number;
}

export class CreateVasanFillPlanDto {
  @IsNumber()
  vasanId: number;

  @IsOptional()
  @IsNumber()
  eventId?: number;

  @IsArray()
  @ArrayMinSize(1, { message: 'At least one food plan must be provided' })
  @ValidateNested({ each: true })
  @Type(() => FoodPlanItem)
  foodPlans: FoodPlanItem[];
}
