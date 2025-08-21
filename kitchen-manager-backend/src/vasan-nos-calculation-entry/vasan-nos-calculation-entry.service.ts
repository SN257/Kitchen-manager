import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VasanNosCalculationEntry } from '../entities/vasan-nos-calculation-entry.entity';
import { CreateVasanNosCalculationEntryDto } from './dto/create-vasan-nos-calculation-entry.dto';

@Injectable()
export class VasanNosCalculationEntryService {
  constructor(
    @InjectRepository(VasanNosCalculationEntry)
    private repo: Repository<VasanNosCalculationEntry>,
  ) {}

  async create(dto: CreateVasanNosCalculationEntryDto, userId: number) {
    const entry = this.repo.create({ ...dto, userId });
    return this.repo.save(entry);
  }

  async update(id: number, dto: CreateVasanNosCalculationEntryDto, userId: number) {
    const existing = await this.repo.findOne({ where: { id, userId } });
    if (!existing) throw new Error('Entry not found or access denied');
  await this.repo.update(id, { entries: dto.entries as any, eventId: dto.eventId ?? existing.eventId });
    return this.repo.findOneBy({ id });
  }

  async findLatestByEventAndUser(eventId: number, userId: number) {
    return this.repo.findOne({ where: { eventId, userId }, order: { createdAt: 'DESC' }, relations: ['event'] });
  }
}
