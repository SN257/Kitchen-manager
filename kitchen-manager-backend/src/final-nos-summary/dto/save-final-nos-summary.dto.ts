export class SaveFinalNosSummaryDto {
  eventId!: number;
  rows!: Array<{
    foodName: string;
    totalWeightKg: number;
    totalNang: number;
    finalFlour: number;
    // optional extra columns added from frontend UI
    extraWeight?: number;
    extraNang?: number;
    extraFlour?: number;
  }>;
}
