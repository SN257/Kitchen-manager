import { Test, TestingModule } from '@nestjs/testing';
import { FoodItemService } from './food-item.service';

describe('FoodItemService', () => {
  let service: FoodItemService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FoodItemService],
    }).compile();

    service = module.get<FoodItemService>(FoodItemService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
