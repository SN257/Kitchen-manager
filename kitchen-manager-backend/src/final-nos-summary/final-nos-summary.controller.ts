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
    // log incoming DTO for debugging (contains rows and extras)
    try {
      console.log(`FinalNosSummary.save called by user=${userId} eventId=${dto.eventId} rowsCount=${Array.isArray(dto.rows) ? dto.rows.length : 0}`);
      if (Array.isArray(dto.rows) && dto.rows.length) {
        console.log('Sample row payload:', JSON.stringify(dto.rows[0]));
      }
    } catch (err) {
      // non-blocking
      console.error('Error logging incoming final-nos-summary dto', err);
    }
    return this.service.createOrReplace(dto, userId);
  }
}
