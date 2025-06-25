import { Test, TestingModule } from '@nestjs/testing';
import { BoxWeightEntryController } from './box-weight-entry.controller';

describe('BoxWeightEntryController', () => {
  let controller: BoxWeightEntryController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BoxWeightEntryController],
    }).compile();

    controller = module.get<BoxWeightEntryController>(BoxWeightEntryController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
