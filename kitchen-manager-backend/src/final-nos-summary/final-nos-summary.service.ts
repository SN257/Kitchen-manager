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
    const entity = this.repo.create({
      eventId: dto.eventId,
      userId,
      rows: dto.rows,
    });
    // debug log the entity rows to verify extras are present
    try {
      console.log(`FinalNosSummary.createOrReplace eventId=${dto.eventId} user=${userId} rows=${Array.isArray(dto.rows) ? dto.rows.length : 0}`);
      if (Array.isArray(dto.rows) && dto.rows.length) console.log('Sample row to save:', JSON.stringify(dto.rows[0]));
    } catch (err) {
      console.error('Error logging final-nos-summary entity', err);
    }
    await this.repo.upsert(entity, {
      conflictPaths: ['eventId', 'userId'],
      skipUpdateIfNoValuesChanged: true,
    });
    // return the latest snapshot
    const latest = await this.latest(dto.eventId, userId);
    try {
      console.log('Saved FinalNosSummary entity id=', latest?.id);
    } catch (err) {}
    return this.latest(dto.eventId, userId);
  }

  async latest(eventId: number, userId: number) {
    return this.repo.findOne({
      where: { eventId, userId },
      order: { updatedAt: 'DESC' },
    });
  }
}
