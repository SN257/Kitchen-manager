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

  async create(dto: CreateWeightCalculationEntryDto, userId: number): Promise<WeightCalculationEntry> {
    const entry = this.repo.create({
      ...dto,
      userId
    });
    return this.repo.save(entry);
  }

  async update(id: number, dto: CreateWeightCalculationEntryDto, userId: number): Promise<WeightCalculationEntry> {
    // Verify the entry belongs to the user
    const existingEntry = await this.repo.findOne({
      where: { id, userId }
    });
    
    if (!existingEntry) {
      throw new Error(`WeightCalculationEntry with id ${id} not found or access denied`);
    }
    
    await this.repo.update(id, dto);
    const entry = await this.repo.findOneBy({ id });
    if (!entry) {
      throw new Error(`WeightCalculationEntry with id ${id} not found`);
    }
    return entry;
  }

  async getLatest(eventId?: number): Promise<WeightCalculationEntry | undefined> {
    const whereCondition = eventId ? { eventId: Number(eventId) } : {};
    
    const entry = await this.repo.findOne({
      where: whereCondition,
      relations: ['event'],
    });
    return entry === null ? undefined : entry;
  }

  async deleteByBoxId(boxId: number): Promise<void> {
    const entries = await this.repo.find();

    for (const entry of entries) {
      const filteredEntries = entry.entries.filter((e: any) => e.boxId !== boxId);
      await this.repo.update(entry.id, { entries: filteredEntries });
    }
  }

  async findLatestByEventAndUser(eventId: number, userId: number) {
    return this.repo.findOne({
      where: { eventId, userId },
      order: { createdAt: 'DESC' },
      relations: ['event']
    });
  }
}
