import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FoodItem } from '../entities/food-item.entity';
import { FoodItemService } from './food-item.service';
import { FoodItemController } from './food-item.controller';

@Module({
  imports: [TypeOrmModule.forFeature([FoodItem])],
  providers: [FoodItemService],
  controllers: [FoodItemController],
})
export class FoodItemModule {}
