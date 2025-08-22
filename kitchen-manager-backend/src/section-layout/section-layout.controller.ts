import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { SectionLayoutService } from './section-layout.service';
import { SaveSectionLayoutDto } from './dto/save-section-layout.dto';

interface CustomSession {
  userId?: number;
}

@Controller('section-layout')
export class SectionLayoutController {
  constructor(private readonly service: SectionLayoutService) {}

  @Get('latest')
  async latest(
    @Req() req: Request & { session: CustomSession },
    @Query('eventId') eventId?: string,
    @Query('sectionId') sectionId?: string,
  ) {
    const { userId } = req.session;
    if (!userId) throw new UnauthorizedException('Not logged in');
    if (!eventId || !sectionId) return null;
    return this.service.get(Number(eventId), Number(sectionId), userId);
  }

  @Post()
  async save(
    @Req() req: Request & { session: CustomSession },
    @Body() dto: SaveSectionLayoutDto,
  ) {
    const { userId } = req.session;
    if (!userId) throw new UnauthorizedException('Not logged in');
    return this.service.saveOrUpdate(dto, userId);
  }
}
