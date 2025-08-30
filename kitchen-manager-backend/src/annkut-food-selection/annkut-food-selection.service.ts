import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnnkutFoodSelection } from '../entities/annkut-food-selection.entity';
import { Event } from '../entities/event.entity';
import { CreateAnnkutFoodSelectionDto } from './dto/create-annkut-food-selection.dto';

@Injectable()
export class AnnkutFoodSelectionService {
  constructor(
    @InjectRepository(AnnkutFoodSelection)
    private readonly repo: Repository<AnnkutFoodSelection>,
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
  ) {}

  async create(dto: CreateAnnkutFoodSelectionDto, userId: number) {
    // Verify the event belongs to the user
    const event = await this.eventRepo.findOne({
      where: { id: dto.eventId, userId },
    });
    if (!event) throw new NotFoundException('Event not found or access denied');

  const entry = this.repo.create({ ...dto, userId });
    return this.repo.save(entry);
  }

  async findAllByUser(userId: number) {
    return this.repo.find({
      where: { event: { userId } },
      order: { id: 'DESC' },
      relations: ['event'],
    });
  }

  async findByEventIdAndUser(eventId: number, userId: number) {
    return this.repo.find({
      where: { eventId, event: { userId } },
      order: { id: 'ASC' },
      relations: ['event'],
    });
  }

  async update(id: number, dto: CreateAnnkutFoodSelectionDto, userId: number) {
    const entry = await this.repo.findOne({
      where: { id, event: { userId } },
      relations: ['event'],
    });
    if (!entry)
      throw new NotFoundException('Selection not found or access denied');

  Object.assign(entry, dto);
    return this.repo.save(entry);
  }

  async remove(id: number, userId: number) {
    const entry = await this.repo.findOne({
      where: { id, event: { userId } },
      relations: ['event'],
    });
    if (!entry)
      throw new NotFoundException('Selection not found or access denied');

    await this.repo.remove(entry);
    return { deleted: true };
  }
}
