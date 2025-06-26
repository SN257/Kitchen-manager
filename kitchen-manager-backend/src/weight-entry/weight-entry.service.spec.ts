import { Test, TestingModule } from '@nestjs/testing';
import { WeightEntryService } from './weight-entry.service';

describe('WeightEntryService', () => {
  let service: WeightEntryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WeightEntryService],
    }).compile();

    service = module.get<WeightEntryService>(WeightEntryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
