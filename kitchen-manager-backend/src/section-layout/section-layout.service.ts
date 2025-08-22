import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SectionLayout } from '../entities/section-layout.entity';
import { SaveSectionLayoutDto } from './dto/save-section-layout.dto';

@Injectable()
export class SectionLayoutService {
  constructor(
    @InjectRepository(SectionLayout)
    private readonly repo: Repository<SectionLayout>,
  ) {}

  async saveOrUpdate(dto: SaveSectionLayoutDto, userId: number) {
    let existing = await this.repo.findOne({
      where: { eventId: dto.eventId, sectionId: dto.sectionId, userId },
    });
    if (existing) {
      existing.cells = dto.cells;
      return this.repo.save(existing);
    }
    existing = this.repo.create({ ...dto, userId });
    return this.repo.save(existing);
  }

  async get(eventId: number, sectionId: number, userId: number) {
    return this.repo.findOne({
      where: { eventId, sectionId, userId },
      order: { updatedAt: 'DESC' },
    });
  }
}
