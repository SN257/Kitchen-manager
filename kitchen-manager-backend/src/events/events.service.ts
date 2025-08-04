import { Injectable } from '@nestjs/common';
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
    
    return this.eventRepo.find({ 
      where: whereCondition,
      order: { id: 'DESC' } 
    });
  }
}
