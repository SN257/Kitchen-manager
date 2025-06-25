import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WeightCalculationEntry } from '../entities/weight-calculation-entry.entity';
import { CreateWeightCalculationEntryDto } from './dto/create-weight-calculation-entry.dto';

@Injectable()
export class WeightCalculationEntryService {
  constructor(
    @InjectRepository(WeightCalculationEntry)
    private repo: Repository<WeightCalculationEntry>,
  ) {}

  async create(dto: CreateWeightCalculationEntryDto): Promise<WeightCalculationEntry> {
    const entry = this.repo.create(dto);
    return this.repo.save(entry);
  }

  async update(id: number, dto: CreateWeightCalculationEntryDto): Promise<WeightCalculationEntry> {
    await this.repo.update(id, dto);
    const entry = await this.repo.findOneBy({ id });
    if (!entry) {
      throw new Error(`WeightCalculationEntry with id ${id} not found`);
    }
    return entry;
  }

  async getLatest(): Promise<WeightCalculationEntry | undefined> {
    const entry = await this.repo.findOne({
      where: {},
      order: { createdAt: 'DESC' },
    });
    return entry === null ? undefined : entry;
  }
}