import { Controller, Post, Body, Req, UnauthorizedException, Get, Put, Delete, Param, Query } from '@nestjs/common';
import { Request } from 'express';
import { WeightEntryService } from './weight-entry.service';
import { CreateWeightEntryDto } from './dto/create-weight-entry.dto';

interface CustomSession {
  userId?: number;
  username?: string;
  role?: string;
}

@Controller('weight-entries')
export class WeightEntryController {
  constructor(private readonly service: WeightEntryService) {}

  @Post()
  async create(@Body() dto: CreateWeightEntryDto, @Req() req: Request & { session: CustomSession }) {
    const { userId } = req.session;
    if (!userId) throw new UnauthorizedException('Not logged in');
    
    return this.service.create(dto, userId);
  }

  @Get()
  async findAll(@Req() req: Request & { session: CustomSession }, @Query('eventId') eventId?: string) {
    // Guard against invalid session
    if (!req.session.userId && req.session.cookie) {
      throw new UnauthorizedException('Session invalid - please login again');
    }
    
    const { userId } = req.session;
    if (!userId) {
      throw new UnauthorizedException('Not logged in');
    }
    
    if (eventId) {
      return this.service.findByEventIdAndUser(Number(eventId), userId);
    }
    return this.service.findAllByUser(userId);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: CreateWeightEntryDto, @Req() req: Request & { session: CustomSession }) {
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
