import { Test, TestingModule } from '@nestjs/testing';
import { BoxRangeService } from './box-range.service';

describe('BoxRangeService', () => {
  let service: BoxRangeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BoxRangeService],
    }).compile();

    service = module.get<BoxRangeService>(BoxRangeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
