export class BoxEntryDto {
    boxRange: string;
    pieces: number;
    boxId: number;
  }
  
  export class MithaiEntryDto {
    mithaiId: number;
    mithaiName: string;
    totalNang: number;
    totalGram: number;
    boxEntries: BoxEntryDto[];
  }
  
  export class CreateWeightCalculationEntryDto {
    entries: any[];
    eventId?: number;
  }
