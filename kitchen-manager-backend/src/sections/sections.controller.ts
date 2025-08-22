import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { SectionsService } from './sections.service';
import { CreateSectionDto } from './dto/create-section.dto';

interface CustomSession {
  userId?: number;
}

@Controller('api/sections')
export class SectionsController {
  constructor(private readonly sectionsService: SectionsService) {}

  @Get()
  async findAll(
    @Req() req: Request & { session: CustomSession },
    @Query('eventId') eventId?: string,
  ) {
    const { userId } = req.session;
    if (!userId) throw new UnauthorizedException('Not logged in');

    const eventIdNumber = eventId ? parseInt(eventId, 10) : undefined;
    return this.sectionsService.findAll(userId, eventIdNumber);
  }

  @Post()
  async create(
    @Body() dto: CreateSectionDto,
    @Req() req: Request & { session: CustomSession },
  ) {
    const { userId } = req.session;
    if (!userId) throw new UnauthorizedException('Not logged in');

    return this.sectionsService.create(dto, userId);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: CreateSectionDto,
    @Req() req: Request & { session: CustomSession },
  ) {
    const { userId } = req.session;
    if (!userId) throw new UnauthorizedException('Not logged in');

    return this.sectionsService.update(parseInt(id, 10), dto, userId);
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @Req() req: Request & { session: CustomSession },
  ) {
    const { userId } = req.session;
    if (!userId) throw new UnauthorizedException('Not logged in');

    return this.sectionsService.remove(parseInt(id, 10), userId);
  }
}
