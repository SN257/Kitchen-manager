import { Controller, Get, Post, Body, Param, Put, Delete } from '@nestjs/common';
import { IngredientService } from './ingredient.service';

@Controller('ingredient')
export class IngredientController {
  constructor(private readonly ingredientService: IngredientService) {}

  @Get()
  findAll() {
    return this.ingredientService.findAll();
  }

  @Post()
  create(@Body() body) {
    return this.ingredientService.create(body);
  }

  @Put(':id')
  update(@Param('id') id: number, @Body() body) {
    return this.ingredientService.update(Number(id), body);
  }

  @Delete(':id')
  delete(@Param('id') id: number) {
    return this.ingredientService.delete(Number(id));
  }
}