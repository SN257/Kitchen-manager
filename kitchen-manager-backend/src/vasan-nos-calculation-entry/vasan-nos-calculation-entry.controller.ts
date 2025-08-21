import { Controller, Post, Body, Put, Param, Get, Query, Req, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { VasanNosCalculationEntryService } from './vasan-nos-calculation-entry.service';
import { CreateVasanNosCalculationEntryDto } from './dto/create-vasan-nos-calculation-entry.dto';

interface CustomSession { userId?: number; }

@Controller('vasan-nos-calculation-entries')
export class VasanNosCalculationEntryController {
  constructor(private readonly service: VasanNosCalculationEntryService) {}

  @Post()
  async create(@Body() dto: CreateVasanNosCalculationEntryDto, @Req() req: Request & { session: CustomSession }) {
    const { userId } = req.session;
    if (!userId) throw new UnauthorizedException('Not logged in');
    const saved = await this.service.create(dto, userId);
    return { success: true, id: saved.id };
  }

  @Put(':id')
  async update(@Param('id') id: number, @Body() dto: CreateVasanNosCalculationEntryDto, @Req() req: Request & { session: CustomSession }) {
    const { userId } = req.session;
    if (!userId) throw new UnauthorizedException('Not logged in');
    const updated = await this.service.update(id, dto, userId);
    return { success: true, id: updated?.id };
  }

  @Get('latest')
  async getLatest(@Query('eventId') eventId: string, @Req() req: Request & { session: CustomSession }) {
    const { userId } = req.session;
    if (!userId) throw new UnauthorizedException('Not logged in');
    return this.service.findLatestByEventAndUser(Number(eventId), userId);
  }
}
