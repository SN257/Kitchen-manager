import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { VasanFillPlanService } from './vasan-fill-plan.service';
import { CreateVasanFillPlanDto } from './dto/create-vasan-fill-plan.dto';

interface CustomSession { userId?: number; }

@Controller('vasan-fill-plans')
export class VasanFillPlanController {
  constructor(private readonly service: VasanFillPlanService) {}

  @Get()
  async findAll(@Req() req: Request & { session: CustomSession }, @Query('eventId') eventId?: string) {
    const { userId } = req.session;
    if (!userId) throw new UnauthorizedException('Not logged in');
    return this.service.findAll(eventId ? Number(eventId) : undefined, userId);
  }

  @Post()
  async create(@Body() dto: CreateVasanFillPlanDto, @Req() req: Request & { session: CustomSession }) {
    const { userId } = req.session;
    if (!userId) throw new UnauthorizedException('Not logged in');
    return this.service.create(dto, userId);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: CreateVasanFillPlanDto, @Req() req: Request & { session: CustomSession }) {
    const { userId } = req.session;
    if (!userId) throw new UnauthorizedException('Not logged in');
    return this.service.update(Number(id), dto, userId);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: Request & { session: CustomSession }) {
    const { userId } = req.session;
    if (!userId) throw new UnauthorizedException('Not logged in');
    return this.service.remove(Number(id), userId);
  }
}
