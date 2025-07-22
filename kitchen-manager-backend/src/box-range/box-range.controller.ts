import { Controller, Get, Post, Put, Delete, Param, Body, Query } from '@nestjs/common';
import { BoxRangeService } from './box-range.service';
import { BoxRange } from '../entities/box-range.entity';

@Controller('box-ranges')
export class BoxRangeController {
    constructor(private readonly boxRangeService: BoxRangeService) {}

    // Get all box ranges
    @Get()
    async findAll(@Query('eventId') eventId?: string) {
        if (eventId) {
            return this.boxRangeService.findByEventId(Number(eventId));
        }
        return this.boxRangeService.findAll();
    }

    // Get a single box range by ID
    @Get(':id')
    async findOne(@Param('id') id: number): Promise<BoxRange> {
        return this.boxRangeService.findOne(id);
    }

    // Create a new box range
    @Post()
    async create(@Body() boxRange: Partial<BoxRange>): Promise<BoxRange> {
        return this.boxRangeService.create(boxRange);
    }

    // Update an existing box range
    @Put(':id')
    async update(@Param('id') id: number, @Body() boxRange: Partial<BoxRange>): Promise<BoxRange> {
        return this.boxRangeService.update(id, boxRange);
    }

    // Delete a box range
    @Delete(':id')
    async delete(@Param('id') id: number): Promise<void> {
        return this.boxRangeService.delete(id);
    }
}
