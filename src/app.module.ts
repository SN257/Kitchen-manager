import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import AppDataSource from './config/typeorm.config';
import { FoodItemModule } from './food-item/food-item.module';
import { IngredientsModule } from './ingredient/ingredient.module';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { RecipesModule } from './recipes/recipes.module';

@Module({
  imports: [
    TypeOrmModule.forRoot(AppDataSource.options),
    FoodItemModule,
    IngredientsModule,
    UserModule,
    AuthModule,
    RecipesModule,
  ],
})
export class AppModule {}