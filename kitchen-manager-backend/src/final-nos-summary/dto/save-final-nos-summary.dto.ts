export class SaveFinalNosSummaryDto {
  eventId!: number;
  rows!: Array<{
    foodName: string;
    totalWeightKg: number;
    totalNang: number;
    finalFlour: number;
  }>;
}
