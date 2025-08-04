import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Put,
  Delete,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { AnnkutSidhuSamanService } from './annkut-sidhu-saman.service';
import { CreateAnnkutSidhuSamanDto } from './dto/create-annkut-sidhu-saman.dto';

interface CustomSession {
  userId?: number;
  username?: string;
  role?: string;
  center?: string;
}

@Controller('annkut-sidhu-saman')
export class AnnkutSidhuSamanController {
  constructor(private readonly sidhuSamanService: AnnkutSidhuSamanService) {}

  @Get()
  async findAll(@Req() req: Request & { session: CustomSession }, @Query('eventId') eventId?: string) {
    const { userId } = req.session;
    if (!userId) throw new UnauthorizedException('Not logged in');

    if (eventId) {
      return this.sidhuSamanService.findByEventIdAndUser(Number(eventId), userId);
    }
    return this.sidhuSamanService.findAllByUser(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: number, @Req() req: Request & { session: any }) {
    const { userId } = req.session;
    if (!userId) throw new UnauthorizedException('Not logged in');
    
    return this.sidhuSamanService.findOneByUser(id, userId);
  }

  @Post()
  async create(@Body() dto: any, @Req() req: Request & { session: CustomSession }) {
    const { userId } = req.session;
    if (!userId) throw new UnauthorizedException('Not logged in');
    
    return this.sidhuSamanService.create(dto, userId);
  }

  @Put(':id')
  update(
    @Param('id') id: number,
    @Body() data: Partial<CreateAnnkutSidhuSamanDto>,
    @Req() req: Request & { session: any }
  ) {
    const { userId } = req.session;
    if (!userId) throw new UnauthorizedException('Not logged in');
    
    return this.sidhuSamanService.update(id, data, userId);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Req() req: Request & { session: CustomSession }) {
    const { userId } = req.session;
    if (!userId) throw new UnauthorizedException('Not logged in');
    
    return this.sidhuSamanService.deleteByIdAndUser(Number(id), userId);
  }
}
