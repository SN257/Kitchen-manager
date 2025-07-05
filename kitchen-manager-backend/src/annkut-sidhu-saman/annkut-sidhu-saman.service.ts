import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnnkutSidhuSaman } from '../entities/annkut-sidhu-saman.entity';

@Injectable()
export class AnnkutSidhuSamanService {
  constructor(
    @InjectRepository(AnnkutSidhuSaman)
    private readonly annakutRepository: Repository<AnnkutSidhuSaman>,
  ) {}

  // Fetch all entries
  async findAll(): Promise<AnnkutSidhuSaman[]> {
    return this.annakutRepository.find();
  }

  // Fetch a single entry by ID
  async findOne(id: number): Promise<AnnkutSidhuSaman> {
    const entry = await this.annakutRepository.findOne({ where: { id } });
    if (!entry) {
      throw new NotFoundException(`AnnkutSidhuSaman with ID ${id} not found`);
    }
    return entry;
  }

  // Create a new entry
  async create(data: Partial<AnnkutSidhuSaman>): Promise<AnnkutSidhuSaman> {
    if (
      !data.mithai_id ||
      !data.mithai_name ||
      data.total_nang == null ||
      data.total_flour == null
    ) {
      throw new Error('Invalid data for AnnkutSidhuSaman');
    }

    const existing = await this.annakutRepository.findOne({
      where: { mithai_id: data.mithai_id },
    });

    if (existing) {
      return existing;
    }

    const newEntry = this.annakutRepository.create(data);
    return await this.annakutRepository.save(newEntry);
  }

  // Update an existing entry
  async update(
    id: number,
    data: Partial<AnnkutSidhuSaman>,
  ): Promise<AnnkutSidhuSaman> {
    await this.annakutRepository.update(id, data);
    const updatedEntry = await this.annakutRepository.findOne({
      where: { id },
    });
    if (!updatedEntry) {
      throw new NotFoundException(`AnnkutSidhuSaman with ID ${id} not found`);
    }
    return updatedEntry;
  }

  // Delete an entry
  async delete(id: number): Promise<void> {
    const result = await this.annakutRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`AnnkutSidhuSaman with ID ${id} not found`);
    }
  }
}
