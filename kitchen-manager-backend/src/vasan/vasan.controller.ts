import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { VasanService } from './vasan.service';
import { CreateVasanDto } from './dto/create-vasan.dto';

interface CustomSession { userId?: number; }

@Controller('vasans')
export class VasanController {
  constructor(private readonly service: VasanService) {}

  @Get()
  async findAll(@Req() req: Request & { session: CustomSession }, @Query('eventId') eventId?: string) {
    const { userId } = req.session;
    if (!userId) throw new UnauthorizedException('Not logged in');
    if (eventId) return this.service.findByEventIdAndUser(Number(eventId), userId);
    return this.service.findAllByUser(userId);
  }

  @Post()
  async create(@Body() dto: CreateVasanDto, @Req() req: Request & { session: CustomSession }) {
    const { userId } = req.session;
    if (!userId) throw new UnauthorizedException('Not logged in');
    return this.service.create(dto, userId);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: CreateVasanDto, @Req() req: Request & { session: CustomSession }) {
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
