import { Test, TestingModule } from '@nestjs/testing';
import { WeightCalculationEntryController } from './weight-calculation-entry.controller';

describe('WeightCalculationEntryController', () => {
  let controller: WeightCalculationEntryController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WeightCalculationEntryController],
    }).compile();

    controller = module.get<WeightCalculationEntryController>(WeightCalculationEntryController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
