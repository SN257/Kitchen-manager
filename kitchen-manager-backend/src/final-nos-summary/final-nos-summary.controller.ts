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
import { FinalNosSummaryService } from './final-nos-summary.service';
import { SaveFinalNosSummaryDto } from './dto/save-final-nos-summary.dto';

interface CustomSession {
  userId?: number;
}

@Controller('final-nos-summary')
export class FinalNosSummaryController {
  constructor(private readonly service: FinalNosSummaryService) {}

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
    @Body() dto: SaveFinalNosSummaryDto,
  ) {
    const { userId } = req.session;
    if (!userId) throw new UnauthorizedException('Not logged in');
    return this.service.createOrReplace(dto, userId);
  }
}
