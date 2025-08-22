import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ingredient } from '../entities/ingredient.entity';

@Injectable()
export class IngredientService {
  constructor(
    @InjectRepository(Ingredient)
    private ingredientRepository: Repository<Ingredient>,
  ) {}

  findAll() {
    return this.ingredientRepository.find();
  }

  create(data: Partial<Ingredient>) {
    const ingredient = this.ingredientRepository.create(data);
    return this.ingredientRepository.save(ingredient);
  }

  async update(id: number, data: Partial<Ingredient>) {
    await this.ingredientRepository.update(id, data);
    return this.ingredientRepository.findOneBy({ id });
  }

  delete(id: number) {
    return this.ingredientRepository.delete(id);
  }
}
