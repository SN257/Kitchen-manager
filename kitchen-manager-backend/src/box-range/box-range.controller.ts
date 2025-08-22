import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { BoxRangeService } from './box-range.service';
import { BoxRange } from '../entities/box-range.entity';

interface CustomSession {
  userId?: number;
  username?: string;
  role?: string;
  center?: string;
}

@Controller('box-ranges')
export class BoxRangeController {
  constructor(private readonly boxRangeService: BoxRangeService) {}

  @Get()
  async findAll(
    @Req() req: Request & { session: CustomSession },
    @Query('eventId') eventId?: string,
  ) {
    const { userId } = req.session;
    if (!userId) throw new UnauthorizedException('Not logged in');

    if (eventId) {
      return this.boxRangeService.findByEventIdAndUser(Number(eventId), userId);
    }
    return this.boxRangeService.findAllByUser(userId);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: number,
    @Req() req: Request & { session: CustomSession },
  ): Promise<BoxRange> {
    const { userId } = req.session;
    if (!userId) throw new UnauthorizedException('Not logged in');

    return this.boxRangeService.findOneByUser(id, userId);
  }

  @Post()
  async create(
    @Body() boxRange: Partial<BoxRange>,
    @Req() req: Request & { session: CustomSession },
  ): Promise<BoxRange> {
    const { userId } = req.session;
    if (!userId) throw new UnauthorizedException('Not logged in');

    return this.boxRangeService.create(boxRange, userId);
  }

  @Put(':id')
  async update(
    @Param('id') id: number,
    @Body() boxRange: Partial<BoxRange>,
    @Req() req: Request & { session: CustomSession },
  ): Promise<BoxRange> {
    const { userId } = req.session;
    if (!userId) throw new UnauthorizedException('Not logged in');

    return this.boxRangeService.update(id, boxRange, userId);
  }

  @Delete(':id')
  async delete(
    @Param('id') id: number,
    @Req() req: Request & { session: CustomSession },
  ): Promise<void> {
    const { userId } = req.session;
    if (!userId) throw new UnauthorizedException('Not logged in');

    return this.boxRangeService.delete(id, userId);
  }
}
