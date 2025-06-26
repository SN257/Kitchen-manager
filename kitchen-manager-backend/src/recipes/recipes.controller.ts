import { Controller, Get, Post, Body, Req, UnauthorizedException, Param, Put, Delete } from '@nestjs/common';
import { RecipesService } from './recipes.service';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { Request } from 'express'; 
import { UserService } from '../user/user.service'; // <-- import UserService

@Controller('recipe')
export class RecipesController {
  constructor(
    private readonly recipesService: RecipesService,
    private readonly userService: UserService, // <-- inject UserService
  ) {}

  @Get()
  async findAll(
    @Req() req: Request & { session: any; query: { center?: string } },
  ) {
    const { userId, role } = req.session;
    if (!userId) throw new UnauthorizedException('Not logged in');
    const center = req.query.center || undefined;
    return this.recipesService.findByUser(
      userId,
      role === 'sant' ? center : undefined,
    );
  }

  @Post()
  async create(
    @Body() createRecipeDto: CreateRecipeDto,
    @Req() req: Request & { session: any }
  ) {
    const userId = req.session.userId;
    if (!userId) throw new UnauthorizedException('Not logged in');
    const user = await this.userService.findById(userId); 
    if (!user) throw new UnauthorizedException('User not found');
    return this.recipesService.create({
      ...createRecipeDto,
      userId,
      center: user.center, 
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