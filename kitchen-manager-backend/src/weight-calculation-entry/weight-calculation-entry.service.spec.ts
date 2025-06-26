import { Test, TestingModule } from '@nestjs/testing';
import { WeightCalculationEntryService } from './weight-calculation-entry.service';

describe('WeightCalculationEntryService', () => {
  let service: WeightCalculationEntryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WeightCalculationEntryService],
    }).compile();

    service = module.get<WeightCalculationEntryService>(WeightCalculationEntryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
