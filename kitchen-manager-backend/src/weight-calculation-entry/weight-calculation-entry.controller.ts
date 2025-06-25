import { Controller, Post, Body, Put, Param, Get } from '@nestjs/common';
import { WeightCalculationEntryService } from './weight-calculation-entry.service';
import { CreateWeightCalculationEntryDto } from './dto/create-weight-calculation-entry.dto';

@Controller('weight-calculation-entries')
export class WeightCalculationEntryController {
  constructor(private readonly service: WeightCalculationEntryService) { }

  @Post()
  async create(@Body() dto: CreateWeightCalculationEntryDto) {
    const saved = await this.service.create(dto);
    return { success: true, id: saved.id };
  }

  @Put(':id')
  async update(@Param('id') id: number, @Body() dto: CreateWeightCalculationEntryDto) {
    const updated = await this.service.update(id, dto);
    return { success: true, id: updated.id };
  }

  @Get('latest')
  async getLatest() {
    // You may want to filter by user if multi-user
    return this.service.getLatest();
  }
}