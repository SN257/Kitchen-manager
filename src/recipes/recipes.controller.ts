import { Controller, Get, Post, Body, Req, UnauthorizedException, Param, Put, Delete } from '@nestjs/common';
import { RecipesService } from './recipes.service';
import { CreateRecipeDto } from './dto/create-recipe.dto';

@Controller('recipes')
export class RecipesController {
  constructor(private readonly recipesService: RecipesService) {}

  @Get()
  async findAll(@Req() req: Request & { session: any }) {
    const userId = req.session.userId;
    if (!userId) throw new UnauthorizedException('Not logged in');
    return this.recipesService.findByUser(userId);
  }

  @Post()
  async create(
    @Body() createRecipeDto: CreateRecipeDto,
    @Req() req: Request & { session: any }
  ) {
    const userId = req.session.userId;
    if (!userId) throw new UnauthorizedException('Not logged in');
    return this.recipesService.create({
      ...createRecipeDto,
      userId,
      center: req.session.center || '',
    });
  }

  @Put(':id')
  async update(@Param('id') id: number, @Body() updateRecipeDto: CreateRecipeDto) {
    return this.recipesService.update(id, updateRecipeDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: number) {
    return this.recipesService.remove(id);
  }
}