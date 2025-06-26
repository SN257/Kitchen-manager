import { Test, TestingModule } from '@nestjs/testing';
import { BoxRangeController } from './box-range.controller';

describe('BoxRangeController', () => {
  let controller: BoxRangeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BoxRangeController],
    }).compile();

    controller = module.get<BoxRangeController>(BoxRangeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
