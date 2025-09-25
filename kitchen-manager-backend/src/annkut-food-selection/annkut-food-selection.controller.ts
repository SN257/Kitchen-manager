import {
  Controller,
  Post,
  Body,
  Req,
  UnauthorizedException,
  Get,
  Put,
  Delete,
  Param,
  Query,
} from '@nestjs/common';
import { Request } from 'express';
import { AnnkutFoodSelectionService } from './annkut-food-selection.service';
import { CreateAnnkutFoodSelectionDto } from './dto/create-annkut-food-selection.dto';

interface CustomSession {
  userId?: number;
  username?: string;
  role?: string;
}

@Controller('annkut-food-selections')
export class AnnkutFoodSelectionController {
  constructor(private readonly service: AnnkutFoodSelectionService) {}

  @Post()
  async create(
    @Body() dto: CreateAnnkutFoodSelectionDto,
    @Req() req: Request & { session: CustomSession },
  ) {
    const { userId } = req.session;
    if (!userId) throw new UnauthorizedException('Not logged in');

    return this.service.create(dto, userId);
  }

  @Get()
  async findAll(
    @Req() req: Request & { session: CustomSession },
    @Query('eventId') eventId?: string,
    @Query('center') center?: string,
  ) {
    if (!req.session.userId && (req as any).session?.cookie) {
      throw new UnauthorizedException('Session invalid - please login again');
    }

    const { userId, role } = req.session;
    if (!userId) throw new UnauthorizedException('Not logged in');

    // If a Sant has provided a center, return selections for that center (across users) optionally filtered by eventId
    // debug: log center/event/role for troubleshooting and indicate branch taken
    if (center && role === 'sant') {
      console.log(`[annkut-food-selection] findAll called WITH center, session.userId=${req.session.userId}, session.role=${role}, eventId=${eventId}`);
      const evId = eventId ? Number(eventId) : undefined;
      const results = await this.service.findByCenterAndEvent(center, evId);
      console.log(`[annkut-food-selection] center-branch results.length=${Array.isArray(results) ? results.length : 0}`);
      return results;
    }
    if (center) {
      console.log(`[annkut-food-selection] center provided but session.role=${role} so center-branch skipped`);
    }

    if (eventId) {
      return this.service.findByEventIdAndUser(Number(eventId), userId);
    }
    return this.service.findAllByUser(userId);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: CreateAnnkutFoodSelectionDto,
    @Req() req: Request & { session: CustomSession },
  ) {
    const { userId } = req.session;
    if (!userId) throw new UnauthorizedException('Not logged in');

    return this.service.update(Number(id), dto, userId);
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @Req() req: Request & { session: CustomSession },
  ) {
    const { userId } = req.session;
    if (!userId) throw new UnauthorizedException('Not logged in');

    return this.service.remove(Number(id), userId);
  }
}
