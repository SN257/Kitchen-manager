import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BoxRange } from '../entities/box-range.entity';

@Injectable()
export class BoxRangeService {
    constructor(
        @InjectRepository(BoxRange)
        private readonly boxRangeRepository: Repository<BoxRange>,
    ) {}

    // Fetch all box ranges
    async findAll(): Promise<BoxRange[]> {
        return this.boxRangeRepository.find();
    }

    // Fetch a single box range by ID
    async findOne(id: number): Promise<BoxRange> {
        const boxRange = await this.boxRangeRepository.findOne({ where: { id } });
        if (!boxRange) {
            throw new NotFoundException(`BoxRange with ID ${id} not found`);
        }
        return boxRange;
    }

    // Create a new box range
    async create(boxRange: Partial<BoxRange>): Promise<BoxRange> {
        const newBoxRange = this.boxRangeRepository.create(boxRange);
        return this.boxRangeRepository.save(newBoxRange);
    }

    // Update an existing box range
    async update(id: number, boxRange: Partial<BoxRange>): Promise<BoxRange> {
        await this.boxRangeRepository.update(id, boxRange);
        const updatedBoxRange = await this.boxRangeRepository.findOne({ where: { id } });
        if (!updatedBoxRange) {
            throw new NotFoundException(`BoxRange with ID ${id} not found`);
        }
        return updatedBoxRange;
    }

    // Delete a box range
    async delete(id: number): Promise<void> {
        const result = await this.boxRangeRepository.delete(id);
        if (result.affected === 0) {
            throw new NotFoundException(`BoxRange with ID ${id} not found`);
        }
    }
}