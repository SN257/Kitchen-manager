import { Test, TestingModule } from '@nestjs/testing';
import { WeightEntryController } from './weight-entry.controller';

describe('WeightEntryController', () => {
  let controller: WeightEntryController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WeightEntryController],
    }).compile();

    controller = module.get<WeightEntryController>(WeightEntryController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
