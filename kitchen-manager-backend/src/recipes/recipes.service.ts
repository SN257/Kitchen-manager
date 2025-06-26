import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Recipe } from '../entities/recipes.entity';
import { User } from '../entities/users.entity';
import { CreateRecipeDto } from './dto/create-recipe.dto';

@Injectable()
export class RecipesService {
  constructor(
    @InjectRepository(Recipe)
    private recipeRepo: Repository<Recipe>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  async create(data: CreateRecipeDto & { userId: number; center: string }) {
    const user = await this.userRepo.findOneBy({ id: data.userId });
    if (!user) throw new Error('User not found');
    const recipe = this.recipeRepo.create({
      ...data,
      user,
      center: data.center,
    });
    console.log('Saving recipe with center:', data.center);
    return this.recipeRepo.save(recipe);
  }

  async findAll(): Promise<Recipe[]> {
    return this.recipeRepo.find();
  }

  async findByUser(userId: number, center?: string): Promise<Recipe[]> {
     if (center) {
      const data = await this.recipeRepo.find({ where: { center } });
      return data;
    }

    return this.recipeRepo.find({
      where: { user: { id: userId } },
    });
  }

  async update(id: number, updateRecipeDto: CreateRecipeDto): Promise<Recipe> {
    await this.recipeRepo.update(id, updateRecipeDto);
    const recipe = await this.recipeRepo.findOneBy({ id });
    if (!recipe) {
      throw new Error(`Recipe with ID ${id} not found`);
    }
    return recipe;
  }

  async remove(id: number): Promise<void> {
    await this.recipeRepo.delete(id);
  }
}