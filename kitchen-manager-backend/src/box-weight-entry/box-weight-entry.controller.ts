import { Controller, Get, Post, Body, Param, Put, Delete, HttpException, HttpStatus } from '@nestjs/common';
import { BoxWeightEntryService } from './box-weight-entry.service';
import { CreateBoxWeightEntryDto } from './dto/create-box-weight-entry.dto';
import { UpdateBoxWeightEntryDto } from './dto/update-box-weight-entry.dto';
import { BoxWeightEntry } from '../entities/box-weight-entry.entity';

@Controller('box-weight-entries')
export class BoxWeightEntryController {
  constructor(private readonly boxWeightEntryService: BoxWeightEntryService) {}

  @Get()
  findAll() {
    return this.boxWeightEntryService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.boxWeightEntryService.findOne(Number(id));
  }

  @Post()
  async createOrUpdateEntries(@Body() entries: BoxWeightEntry[]): Promise<BoxWeightEntry[]> {
    if (!Array.isArray(entries)) {
      throw new HttpException('Invalid payload format. Expected an array.', HttpStatus.BAD_REQUEST);
    }

    try {
      return await this.boxWeightEntryService.createOrUpdateEntries(entries);
    } catch (error) {
      console.error('Error saving box weight entries:', error);
      throw new HttpException('Internal Server Error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBoxWeightEntryDto) {
    return this.boxWeightEntryService.update(Number(id), dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.boxWeightEntryService.remove(Number(id));
  }
}