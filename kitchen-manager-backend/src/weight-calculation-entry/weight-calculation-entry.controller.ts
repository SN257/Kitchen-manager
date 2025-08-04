import { Controller, Post, Body, Put, Param, Get, Delete, HttpException, HttpStatus, Query, Req, UnauthorizedException } from '@nestjs/common';
import { WeightCalculationEntryService } from './weight-calculation-entry.service';
import { CreateWeightCalculationEntryDto } from './dto/create-weight-calculation-entry.dto';
import { Request } from 'express';

interface CustomSession {
  userId?: number;
  username?: string;
  role?: string;
  center?: string;
}

@Controller('weight-calculation-entries')
export class WeightCalculationEntryController {
  constructor(private readonly service: WeightCalculationEntryService) {}

  @Post()
  async create(@Body() dto: CreateWeightCalculationEntryDto, @Req() req: Request & { session: CustomSession }) {
    const { userId } = req.session;
    if (!userId) throw new UnauthorizedException('Not logged in');
    
    const saved = await this.service.create(dto, userId);
    return { success: true, id: saved.id };
  }

  @Put(':id')
  async update(@Param('id') id: number, @Body() dto: CreateWeightCalculationEntryDto, @Req() req: Request & { session: CustomSession }) {
    const { userId } = req.session;
    if (!userId) throw new UnauthorizedException('Not logged in');
    
    const updated = await this.service.update(id, dto, userId);
    return { success: true, id: updated.id };
  }

  @Get('latest')
  async getLatest(@Query('eventId') eventId: string, @Req() req: Request & { session: CustomSession }) {
    const { userId } = req.session;
    if (!userId) throw new UnauthorizedException('Not logged in');
    
    return this.service.findLatestByEventAndUser(Number(eventId), userId);
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
