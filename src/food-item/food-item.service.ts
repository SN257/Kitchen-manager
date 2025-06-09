import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FoodItem } from '../entities/food-item.entity';

@Injectable()
export class FoodItemService {
  constructor(
    @InjectRepository(FoodItem)
    private foodItemRepository: Repository<FoodItem>,
  ) {}

  findAll(): Promise<FoodItem[]> {
    return this.foodItemRepository.find();
  }

  create(data: Partial<FoodItem>): Promise<FoodItem> {
    const item = this.foodItemRepository.create(data);
    return this.foodItemRepository.save(item);
  }

  async update(id: number, data: Partial<FoodItem>): Promise<FoodItem> {
    await this.foodItemRepository.update(id, data);
    const item = await this.foodItemRepository.findOneBy({ id });
    if (!item) {
      throw new Error(`FoodItem with id ${id} not found`);
    }
    return item;
  }

  async remove(id: number): Promise<void> {
    await this.foodItemRepository.delete(id);
  }
}