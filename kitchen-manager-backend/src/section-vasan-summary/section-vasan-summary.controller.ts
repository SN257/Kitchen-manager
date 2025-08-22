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
import { SectionVasanSummaryService } from './section-vasan-summary.service';
import { CreateSectionVasanSummaryDto } from './dto/create-section-vasan-summary.dto';

interface CustomSession {
  userId?: number;
}

@Controller('section-vasan-summary')
export class SectionVasanSummaryController {
  constructor(private readonly service: SectionVasanSummaryService) {}

  @Get('latest')
  async latest(
    @Req() req: Request & { session: CustomSession },
    @Query('eventId') eventId?: string,
  ) {
    const { userId } = req.session;
    if (!userId) throw new UnauthorizedException('Not logged in');
    if (!eventId) return null;
    return this.service.latest(Number(eventId), userId);
  }

  @Post()
  async save(
    @Req() req: Request & { session: CustomSession },
    @Body() dto: CreateSectionVasanSummaryDto,
  ) {
    const { userId } = req.session;
    if (!userId) throw new UnauthorizedException('Not logged in');
    return this.service.createOrReplace(dto, userId);
  }
}
