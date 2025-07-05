import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Put,
  Delete,
} from '@nestjs/common';
import { AnnkutSidhuSamanService } from './annkut-sidhu-saman.service';
import { CreateAnnkutSidhuSamanDto } from './dto/create-annkut-sidhu-saman.dto';

@Controller('annkut-sidhu-saman')
export class AnnkutSidhuSamanController {
  constructor(private readonly sidhuSamanService: AnnkutSidhuSamanService) {}

  @Get()
  findAll(): Promise<CreateAnnkutSidhuSamanDto[]> {
    return this.sidhuSamanService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: number): Promise<CreateAnnkutSidhuSamanDto> {
    return this.sidhuSamanService.findOne(id);
  }

  @Post()
  create(@Body() data: CreateAnnkutSidhuSamanDto) {
    return this.sidhuSamanService.create(data);
  }

  @Put(':id')
  update(
    @Param('id') id: number,
    @Body() data: Partial<CreateAnnkutSidhuSamanDto>,
  ) {
    return this.sidhuSamanService.update(id, data);
  }

  @Delete(':id')
  delete(@Param('id') id: number): Promise<void> {
    return this.sidhuSamanService.delete(id);
  }
}
