import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from '../entities/event.entity';
import { CreateEventDto } from './dto/create-event.dto';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private eventRepo: Repository<Event>,
  ) {}

  async create(data: CreateEventDto & { userId: number }): Promise<Event> {
    const event = this.eventRepo.create(data);
    return this.eventRepo.save(event);
  }

  async findAll(): Promise<Event[]> {
    return this.eventRepo.find({ order: { id: 'DESC' } });
  }

  async findByUser(userId: number, eventName?: string): Promise<Event[]> {
    const whereCondition: any = { userId };
    if (eventName) {
      whereCondition.eventName = eventName;
    }

    const events = await this.eventRepo.find({
      where: whereCondition,
      order: { eventName: 'ASC', eventYear: 'ASC' },
    });

    // Group events by name and sort by year within each group
    const groupedEvents = events.reduce(
      (acc, event) => {
        const key = event.eventName;
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(event);
        return acc;
      },
      {} as Record<string, Event[]>,
    );

    // Sort each group by year and flatten
    const sortedEvents = Object.keys(groupedEvents)
      .sort() // Sort event names alphabetically
      .flatMap((eventName) =>
        groupedEvents[eventName].sort(
          (a, b) => parseInt(a.eventYear) - parseInt(b.eventYear),
        ),
      );

    return sortedEvents;
  }

  async update(
    id: number,
    data: CreateEventDto,
    userId: number,
  ): Promise<Event> {
    const event = await this.eventRepo.findOne({ where: { id, userId } });
    if (!event) {
      throw new NotFoundException('Event not found or access denied');
    }

    await this.eventRepo.update({ id, userId }, data);
    const updatedEvent = await this.eventRepo.findOne({
      where: { id, userId },
    });
    if (!updatedEvent) {
      throw new NotFoundException('Event not found after update');
    }
    return updatedEvent;
  }

  async remove(id: number, userId: number): Promise<void> {
    const event = await this.eventRepo.findOne({ where: { id, userId } });
    if (!event) {
      throw new NotFoundException('Event not found or access denied');
    }

    await this.eventRepo.delete({ id, userId });
  }
}
