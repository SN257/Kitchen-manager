import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WeightEntry } from '../entities/weight_entry.entity';
import { CreateWeightEntryDto } from './dto/create-weight-entry.dto';

@Injectable()
export class WeightEntryService {
  constructor(
    @InjectRepository(WeightEntry)
    private readonly repo: Repository<WeightEntry>,
  ) {}

  async create(dto: CreateWeightEntryDto) {
    const entry = this.repo.create(dto);
    return this.repo.save(entry);
  }

  async findAll() {
    return this.repo.find({ 
      order: { id: 'DESC' },
      relations: ['event']
    });
  }

  async update(id: number, dto: CreateWeightEntryDto) {
    const entry = await this.repo.findOne({ where: { id } });
    if (!entry) throw new NotFoundException('Weight entry not found');
    Object.assign(entry, dto);
    return this.repo.save(entry);
  }

  async remove(id: number) {
    const entry = await this.repo.findOne({ where: { id } });
    if (!entry) throw new NotFoundException('Weight entry not found');
    await this.repo.remove(entry);
    return { deleted: true };
  }

  async findByEventId(eventId: number) {
    return this.repo.find({
      where: { eventId },
      order: { id: 'ASC' },
      relations: ['event']
    });
  }
}
