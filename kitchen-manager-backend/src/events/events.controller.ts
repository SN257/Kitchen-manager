import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Query,
  Param,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';

@Controller('api/events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  async findAll(
    @Req() req: Request & { session: any },
    @Query('eventName') eventName?: string,
  ) {
    const { userId } = req.session;
    if (!userId) throw new UnauthorizedException('Not logged in');

    return this.eventsService.findByUser(userId, eventName);
  }

  @Post()
  create(@Body() dto: CreateEventDto, @Req() req: Request & { session: any }) {
    const { userId } = req.session;
    if (!userId) throw new UnauthorizedException('Not logged in');

    return this.eventsService.create({ ...dto, userId });
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: CreateEventDto,
    @Req() req: Request & { session: any },
  ) {
    const { userId } = req.session;
    if (!userId) throw new UnauthorizedException('Not logged in');

    return this.eventsService.update(Number(id), dto, userId);
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @Req() req: Request & { session: any },
  ) {
    const { userId } = req.session;
    if (!userId) throw new UnauthorizedException('Not logged in');

    return this.eventsService.remove(Number(id), userId);
  }
}
