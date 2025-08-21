export interface SectionEntryDto {
  sectionId: number;
  sectionName: string;
  count: number;
}

export interface VasanSectionEntryDto {
  vasanId: number;
  vasanName: string;
  foodName: string;
  totalVasan: number; // sum of counts across sections
  sectionEntries: SectionEntryDto[];
}

export class CreateVasanNosCalculationEntryDto {
  entries: VasanSectionEntryDto[];
  eventId?: number;
}
