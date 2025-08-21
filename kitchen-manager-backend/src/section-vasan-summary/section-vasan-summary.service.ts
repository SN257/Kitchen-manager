import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SectionVasanSummary } from '../entities/section-vasan-summary.entity';
import { CreateSectionVasanSummaryDto } from './dto/create-section-vasan-summary.dto';

@Injectable()
export class SectionVasanSummaryService {
  constructor(@InjectRepository(SectionVasanSummary) private readonly repo: Repository<SectionVasanSummary>) {}

  async createOrReplace(dto: CreateSectionVasanSummaryDto, userId: number) {
    const existing = await this.repo.findOne({ where: { eventId: dto.eventId, userId } });
    if (existing) {
      existing.rows = dto.rows;
      return this.repo.save(existing);
    }
    const created = this.repo.create({ ...dto, userId });
    return this.repo.save(created);
  }

  async latest(eventId: number, userId: number) {
    return this.repo.findOne({ where: { eventId, userId }, order: { updatedAt: 'DESC' } });
  }
}
