import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnnkutSidhuSaman } from '../entities/annkut-sidhu-saman.entity';
import { CreateAnnkutSidhuSamanDto } from './dto/create-annkut-sidhu-saman.dto';

@Injectable()
export class AnnkutSidhuSamanService {
  constructor(
    @InjectRepository(AnnkutSidhuSaman)
    private readonly repository: Repository<AnnkutSidhuSaman>,
  ) {}

  async findAllByUser(userId: number) {
    return this.repository.find({ 
      where: { userId },
      order: { id: 'ASC' },
      relations: ['event']
    });
  }

  async findOneByUser(id: number, userId: number): Promise<AnnkutSidhuSaman> {
    const result = await this.repository.findOne({
      where: { id, event: { userId } },
      relations: ['event']
    });

    if (!result) {
      throw new Error(`AnnkutSidhuSaman with id ${id} not found`);
    }

    return result;
  }

  async create(dto: any, userId: number) {
    // Check if entry already exists for this mithai_id, eventId, and userId
    const existingEntry = await this.repository.findOne({
      where: { 
        mithai_id: dto.mithai_id, 
        eventId: dto.eventId, 
        userId 
      }
    });

    if (existingEntry) {
      // Update existing entry
      await this.repository.update(existingEntry.id, {
        mithai_name: dto.mithai_name,
        total_nang: dto.total_nang,
        total_flour: dto.total_flour
      });
      return this.repository.findOne({ where: { id: existingEntry.id } });
    } else {
      // Create new entry
      const entry = this.repository.create({
        ...dto,
        userId
      });
      return this.repository.save(entry);
    }
  }

  async update(id: number, data: Partial<CreateAnnkutSidhuSamanDto>, userId: number): Promise<AnnkutSidhuSaman> {
    await this.repository.update({ id, event: { userId } }, data);
    return this.findOneByUser(id, userId);
  }

  async deleteByIdAndUser(id: number, userId: number) {
    const entry = await this.repository.findOne({
      where: { id, userId }
    });
    
    if (!entry) {
      throw new NotFoundException('Entry not found or access denied');
    }
    
    return this.repository.remove(entry);
  }

  async findByEventIdAndUser(eventId: number, userId: number) {
    return this.repository.find({
      where: { eventId, userId },
      order: { id: 'ASC' },
      relations: ['event']
    });
  }
}
