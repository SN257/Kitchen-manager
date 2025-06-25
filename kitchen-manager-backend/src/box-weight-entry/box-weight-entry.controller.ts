import { Controller, Get, Post, Body, Param, Put, Delete } from '@nestjs/common';
import { BoxWeightEntryService } from './box-weight-entry.service';
import { CreateBoxWeightEntryDto } from './dto/create-box-weight-entry.dto';
import { UpdateBoxWeightEntryDto } from './dto/update-box-weight-entry.dto';

@Controller('box-weight-entries')
export class BoxWeightEntryController {
  constructor(private readonly service: BoxWeightEntryService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(Number(id));
  }

  @Post()
  create(@Body() dto: CreateBoxWeightEntryDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBoxWeightEntryDto) {
    return this.service.update(Number(id), dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(Number(id));
  }
}