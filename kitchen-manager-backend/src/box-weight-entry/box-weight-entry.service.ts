import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BoxWeightEntry } from '../entities/box-weight-entry.entity';
import { CreateBoxWeightEntryDto } from './dto/create-box-weight-entry.dto';
import { UpdateBoxWeightEntryDto } from './dto/update-box-weight-entry.dto';

@Injectable()
export class BoxWeightEntryService {
  constructor(
    @InjectRepository(BoxWeightEntry)
    private repo: Repository<BoxWeightEntry>,
  ) {}

  findAll(): Promise<BoxWeightEntry[]> {
    return this.repo.find();
  }

  async findOne(id: number): Promise<BoxWeightEntry> {
    const entry = await this.repo.findOneBy({ id });
    if (!entry) throw new NotFoundException('BoxWeightEntry not found');
    return entry;
  }

  create(dto: CreateBoxWeightEntryDto): Promise<BoxWeightEntry> {
    const entry = this.repo.create(dto);
    return this.repo.save(entry);
  }

  async update(id: number, dto: UpdateBoxWeightEntryDto): Promise<BoxWeightEntry> {
    await this.repo.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.repo.delete(id);
  }
}