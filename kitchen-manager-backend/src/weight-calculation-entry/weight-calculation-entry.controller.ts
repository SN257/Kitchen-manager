import { Controller, Post, Body, Put, Param, Get, Delete, HttpException, HttpStatus, Query } from '@nestjs/common';
import { WeightCalculationEntryService } from './weight-calculation-entry.service';
import { CreateWeightCalculationEntryDto } from './dto/create-weight-calculation-entry.dto';

@Controller('weight-calculation-entries')
export class WeightCalculationEntryController {
  constructor(private readonly service: WeightCalculationEntryService) {}

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
  async getLatest(@Query('eventId') eventId?: string) {
    return this.service.getLatest(eventId ? Number(eventId) : undefined);
  }

  @Delete('delete-by-box/:boxId')
  async deleteByBoxId(@Param('boxId') boxId: number) {
    try {
      await this.service.deleteByBoxId(boxId);
      return { success: true, message: 'Associated weight calculation entries deleted successfully.' };
    } catch (error) {
      throw new HttpException(
        'Failed to delete associated weight calculation entries.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
