import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Recipe } from '../entities/recipes.entity';
import { User } from '../entities/users.entity';
import { RecipesService } from './recipes.service';
import { RecipesController } from './recipes.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Recipe, User])], 
  providers: [RecipesService],
  controllers: [RecipesController],
})
export class RecipesModule {}