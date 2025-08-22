import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinalNosSummary } from '../entities/final-nos-summary.entity';
import { SaveFinalNosSummaryDto } from './dto/save-final-nos-summary.dto';

@Injectable()
export class FinalNosSummaryService {
  constructor(
    @InjectRepository(FinalNosSummary)
    private readonly repo: Repository<FinalNosSummary>,
  ) {}

  async createOrReplace(dto: SaveFinalNosSummaryDto, userId: number) {
    const existing = await this.repo.findOne({
      where: { eventId: dto.eventId, userId },
    });
      const entity = this.repo.create({ eventId: dto.eventId, userId, rows: dto.rows });
      await this.repo.upsert(entity, {
        conflictPaths: ['eventId', 'userId'],
        skipUpdateIfNoValuesChanged: true,
      });
      // return the latest snapshot
      return this.latest(dto.eventId, userId);
  }

  async latest(eventId: number, userId: number) {
    return this.repo.findOne({
      where: { eventId, userId },
      order: { updatedAt: 'DESC' },
    });
  }
}
