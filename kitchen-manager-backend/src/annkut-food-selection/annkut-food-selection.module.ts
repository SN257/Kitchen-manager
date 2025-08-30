import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnnkutFoodSelection } from '../entities/annkut-food-selection.entity';
import { Event } from '../entities/event.entity';
import { AnnkutFoodSelectionController } from './annkut-food-selection.controller';
import { AnnkutFoodSelectionService } from './annkut-food-selection.service';

@Module({
  imports: [TypeOrmModule.forFeature([AnnkutFoodSelection, Event])],
  controllers: [AnnkutFoodSelectionController],
  providers: [AnnkutFoodSelectionService],
})
export class AnnkutFoodSelectionModule {}
