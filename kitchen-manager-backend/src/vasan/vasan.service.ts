import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vasan } from '../entities/vasan.entity';
import { Event } from '../entities/event.entity';
import { CreateVasanDto } from './dto/create-vasan.dto';

@Injectable()
export class VasanService {
  constructor(
    @InjectRepository(Vasan) private readonly repo: Repository<Vasan>,
    @InjectRepository(Event) private readonly eventRepo: Repository<Event>,
  ) {}

  async create(dto: CreateVasanDto, userId: number) {
    if (dto.eventId) {
      const event = await this.eventRepo.findOne({ where: { id: dto.eventId, userId } });
      if (!event) throw new NotFoundException('Event not found or access denied');
    }
    const vasan = this.repo.create({ ...dto, userId });
    return this.repo.save(vasan);
  }

  async findAllByUser(userId: number) {
    return this.repo.find({ where: { userId }, order: { id: 'ASC' }, relations: ['event'] });
  }

  async findByEventIdAndUser(eventId: number, userId: number) {
    return this.repo.find({ where: { eventId, userId }, order: { id: 'ASC' }, relations: ['event'] });
  }

  async update(id: number, dto: CreateVasanDto, userId: number) {
  const existing = await this.repo.findOne({ where: { id, userId }, relations: ['event'] });
  if (!existing) throw new NotFoundException('Vasan entry not found or access denied');
  existing.vasanName = dto.vasanName;
  existing.description = dto.description;
  if (dto.eventId !== undefined) existing.eventId = dto.eventId;
  return this.repo.save(existing);
  }

  async remove(id: number, userId: number) {
    const existing = await this.repo.findOne({ where: { id, userId } });
    if (!existing) throw new NotFoundException('Vasan entry not found or access denied');
    await this.repo.remove(existing);
    return { deleted: true };
  }
}
