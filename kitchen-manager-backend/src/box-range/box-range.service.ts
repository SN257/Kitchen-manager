import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BoxRange } from '../entities/box-range.entity';
import { Event } from '../entities/event.entity';

@Injectable()
export class BoxRangeService {
  constructor(
    @InjectRepository(BoxRange)
    private readonly boxRangeRepository: Repository<BoxRange>,
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
  ) {}

  async findAllByUser(userId: number) {
    return this.boxRangeRepository.find({
      where: { userId },
      order: { id: 'ASC' },
      relations: ['event'],
    });
  }

  async findOneByUser(id: number, userId: number): Promise<BoxRange> {
    const boxRange = await this.boxRangeRepository.findOne({
      where: { id, event: { userId } },
      relations: ['event'],
    });
    if (!boxRange) {
      throw new NotFoundException(
        `BoxRange with ID ${id} not found or access denied`,
      );
    }
    return boxRange;
  }

  async create(boxRange: Partial<BoxRange>, userId: number): Promise<BoxRange> {
    // Verify the event belongs to the user
    if (boxRange.eventId) {
      const event = await this.eventRepository.findOne({
        where: { id: boxRange.eventId, userId },
      });

      if (!event) {
        throw new NotFoundException('Event not found or access denied');
      }
    }

    const newBoxRange = this.boxRangeRepository.create({
      ...boxRange,
      userId: userId,
    });
    return this.boxRangeRepository.save(newBoxRange);
  }

  async update(
    id: number,
    boxRange: Partial<BoxRange>,
    userId: number,
  ): Promise<BoxRange> {
    // Find box range that belongs to user's event
    const existingBoxRange = await this.boxRangeRepository.findOne({
      where: { id, event: { userId } },
      relations: ['event'],
    });

    if (!existingBoxRange) {
      throw new NotFoundException(
        `BoxRange with ID ${id} not found or access denied`,
      );
    }

    await this.boxRangeRepository.update(id, boxRange);
    const updatedBoxRange = await this.boxRangeRepository.findOne({
      where: { id },
      relations: ['event'],
    });

    if (!updatedBoxRange) {
      throw new NotFoundException(`BoxRange with ID ${id} not found`);
    }
    return updatedBoxRange;
  }

  async delete(id: number, userId: number): Promise<void> {
    // Find box range that belongs to user's event
    const boxRange = await this.boxRangeRepository.findOne({
      where: { id, event: { userId } },
      relations: ['event'],
    });

    if (!boxRange) {
      throw new NotFoundException(
        `BoxRange with ID ${id} not found or access denied`,
      );
    }

    const result = await this.boxRangeRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`BoxRange with ID ${id} not found`);
    }
  }

  async findByEventIdAndUser(eventId: number, userId: number) {
    return this.boxRangeRepository.find({
      where: { eventId, userId },
      order: { id: 'ASC' },
      relations: ['event'],
    });
  }

  // Keep existing methods for backward compatibility
  async findAll() {
    return this.boxRangeRepository.find({
      order: { id: 'ASC' },
      relations: ['event'],
    });
  }

  async findOne(id: number): Promise<BoxRange> {
    const boxRange = await this.boxRangeRepository.findOne({ where: { id } });
    if (!boxRange) {
      throw new NotFoundException(`BoxRange with ID ${id} not found`);
    }
    return boxRange;
  }

  async findByEventId(eventId: number) {
    return this.boxRangeRepository.find({
      where: { eventId },
      order: { id: 'ASC' },
      relations: ['event'],
    });
  }
}
