import { Controller, Get, Post, Body, Delete, Param, Put } from '@nestjs/common';
import { FoodItemService } from './food-item.service';
import { FoodItem } from '../entities/food-item.entity';

@Controller('food-items')
export class FoodItemController {
  constructor(private readonly foodItemService: FoodItemService) {}

  @Get()
  findAll(): Promise<FoodItem[]> {
    return this.foodItemService.findAll();
  }

  @Post()
  create(@Body() data: Partial<FoodItem>): Promise<FoodItem> {
    return this.foodItemService.create(data);
  }

  @Delete(':id')
  async remove(@Param('id') id: number) {
    await this.foodItemService.remove(id);
    return { success: true };
  }

  @Put(':id')
  async update(@Param('id') id: number, @Body() data: Partial<FoodItem>) {
    return this.foodItemService.update(id, data);
  }
}