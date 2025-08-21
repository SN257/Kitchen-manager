export class SaveSectionLayoutDto {
  eventId!: number;
  sectionId!: number;
  cells!: { index:number; fillPlanId?:number; vasanId?:number }[];
}
