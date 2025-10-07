import {
  Controller,
  Post,
  Body,
  Put,
  Param,
  Get,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { VasanNosCalculationEntryService } from './vasan-nos-calculation-entry.service';
import { CreateVasanNosCalculationEntryDto } from './dto/create-vasan-nos-calculation-entry.dto';

interface CustomSession {
  userId?: number;
}

@Controller('vasan-nos-calculation-entries')
export class VasanNosCalculationEntryController {
  constructor(private readonly service: VasanNosCalculationEntryService) {}

  @Post()
  async create(
    @Body() dto: CreateVasanNosCalculationEntryDto,
    @Req() req: Request & { session: CustomSession },
  ) {
    const { userId } = req.session;
    if (!userId) throw new UnauthorizedException('Not logged in');
    const saved = await this.service.create(dto, userId);
    // Try to trigger server-side recompute of section summary
    try {
      // service may expose recomputeAndSaveSummary
      if (typeof (this.service as any).recomputeAndSaveSummary === 'function') {
        await (this.service as any).recomputeAndSaveSummary(dto.eventId, userId);
      }
    } catch (err) {
      // do not fail the request if recompute fails
      console.error('Recompute after create failed', err);
    }
    return { success: true, id: saved.id };
  }

  @Put(':id')
  async update(
    @Param('id') id: number,
    @Body() dto: CreateVasanNosCalculationEntryDto,
    @Req() req: Request & { session: CustomSession },
  ) {
    const { userId } = req.session;
    if (!userId) throw new UnauthorizedException('Not logged in');
    const updated = await this.service.update(id, dto, userId);
    try {
      if (typeof (this.service as any).recomputeAndSaveSummary === 'function') {
        await (this.service as any).recomputeAndSaveSummary(dto.eventId ?? updated?.eventId, userId);
      }
    } catch (err) {
      console.error('Recompute after update failed', err);
    }
    return { success: true, id: updated?.id };
  }

  @Get('latest')
  async getLatest(
    @Query('eventId') eventId: string,
    @Req() req: Request & { session: CustomSession },
  ) {
    const { userId } = req.session;
    if (!userId) throw new UnauthorizedException('Not logged in');
    return this.service.findLatestByEventAndUser(Number(eventId), userId);
  }
}
