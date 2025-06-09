import { Test, TestingModule } from '@nestjs/testing';
import { FoodItemController } from './food-item.controller';

describe('FoodItemController', () => {
  let controller: FoodItemController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FoodItemController],
    }).compile();

    controller = module.get<FoodItemController>(FoodItemController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
