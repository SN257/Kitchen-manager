import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Recipe } from '../entities/recipes.entity';
import { User } from '../entities/users.entity';
import { ActivityLog } from '../entities/activity-log.entity';
import { RecipesService } from './recipes.service';
import { RecipesController } from './recipes.controller';
import { UserService } from '../user/user.service';

@Module({
  imports: [TypeOrmModule.forFeature([Recipe, User, ActivityLog])],
  providers: [RecipesService, UserService],
  controllers: [RecipesController],
})
export class RecipesModule {}
