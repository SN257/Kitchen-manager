import { Test, TestingModule } from '@nestjs/testing';
import { BoxWeightEntryService } from './box-weight-entry.service';

describe('BoxWeightEntryService', () => {
  let service: BoxWeightEntryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BoxWeightEntryService],
    }).compile();

    service = module.get<BoxWeightEntryService>(BoxWeightEntryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
