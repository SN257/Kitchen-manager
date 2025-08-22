import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Section } from '../entities/sections.entity';
import { CreateSectionDto } from './dto/create-section.dto';

@Injectable()
export class SectionsService {
  constructor(
    @InjectRepository(Section)
    private sectionRepo: Repository<Section>,
  ) {}

  async findAll(userId: number, eventId?: number): Promise<Section[]> {
    const whereCondition: any = { userId };

    if (eventId) {
      whereCondition.eventId = eventId;
    }
    const sections = await this.sectionRepo.find({
      where: whereCondition,
      relations: ['event'],
      order: { id: 'DESC' },
    });
    return sections;
  }

  async create(dto: CreateSectionDto, userId: number): Promise<Section> {
    const section = this.sectionRepo.create({
      ...dto,
      userId,
    });
    return this.sectionRepo.save(section);
  }

  async update(
    id: number,
    dto: CreateSectionDto,
    userId: number,
  ): Promise<Section> {
    const section = await this.sectionRepo.findOne({
      where: { id, userId },
    });

    if (!section) {
      throw new NotFoundException('Section not found');
    }

    Object.assign(section, dto);
    return this.sectionRepo.save(section);
  }

  async remove(id: number, userId: number): Promise<void> {
    const section = await this.sectionRepo.findOne({
      where: { id, userId },
    });

    if (!section) {
      throw new NotFoundException('Section not found');
    }

    await this.sectionRepo.remove(section);
  }
}
