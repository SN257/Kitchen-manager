import { Controller, Get, Post, Body, Param, Put, Delete, HttpException, HttpStatus, Req, Query, UnauthorizedException } from '@nestjs/common';
import { BoxWeightEntryService } from './box-weight-entry.service';
import { CreateBoxWeightEntryDto } from './dto/create-box-weight-entry.dto';
import { UpdateBoxWeightEntryDto } from './dto/update-box-weight-entry.dto';
import { BoxWeightEntry } from '../entities/box-weight-entry.entity';
import { Request } from 'express';

interface CustomSession {
  userId: number;
}

@Controller('box-weight-entries')
export class BoxWeightEntryController {
  constructor(private readonly boxWeightEntryService: BoxWeightEntryService) {}

  @Get()
  async findAll(@Req() req: Request & { session: CustomSession }, @Query('eventId') eventId?: string) {
    const { userId } = req.session;
    if (!userId) throw new UnauthorizedException('Not logged in');

    if (eventId) {
      return this.boxWeightEntryService.findByEventIdAndUser(Number(eventId), userId);
    }
    return this.boxWeightEntryService.findAllByUser(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.boxWeightEntryService.findOne(Number(id));
  }

  @Post()
  async create(@Body() entries: Partial<BoxWeightEntry>[], @Req() req: Request & { session: CustomSession }) {
    const { userId } = req.session;
    if (!userId) throw new UnauthorizedException('Not logged in');
    
    return this.boxWeightEntryService.createMultiple(entries, userId);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBoxWeightEntryDto) {
    return this.boxWeightEntryService.update(Number(id), dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.boxWeightEntryService.remove(Number(id));
  }
}
