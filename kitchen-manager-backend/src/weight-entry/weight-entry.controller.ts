import { Controller, Post, Body, Get, Put, Param, Delete } from '@nestjs/common';
import { WeightEntryService } from './weight-entry.service';
import { CreateWeightEntryDto } from './dto/create-weight-entry.dto';

@Controller('weight-entries')
export class WeightEntryController {
  constructor(private readonly service: WeightEntryService) {}

  @Post()
  async create(@Body() dto: CreateWeightEntryDto) {
    return this.service.create(dto);
  }

  @Get()
  async findAll() {
    return this.service.findAll();
  }
  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: CreateWeightEntryDto) {
    return this.service.update(Number(id), dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.service.remove(Number(id));
  }
}