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
    private readonly boxWeightEntryRepository: Repository<BoxWeightEntry>,
  ) {}

  findAll(): Promise<BoxWeightEntry[]> {
    return this.boxWeightEntryRepository.find();
  }

  async findOne(id: number): Promise<BoxWeightEntry> {
    const entry = await this.boxWeightEntryRepository.findOneBy({ id });
    if (!entry) throw new NotFoundException('BoxWeightEntry not found');
    return entry;
  }

  create(dto: CreateBoxWeightEntryDto): Promise<BoxWeightEntry> {
    const entry = this.boxWeightEntryRepository.create(dto);
    return this.boxWeightEntryRepository.save(entry);
  }

  async update(id: number, dto: UpdateBoxWeightEntryDto): Promise<BoxWeightEntry> {
    await this.boxWeightEntryRepository.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.boxWeightEntryRepository.delete(id);
  }

  async createOrUpdateEntries(entries: BoxWeightEntry[]): Promise<BoxWeightEntry[]> {
    const updatedEntries: BoxWeightEntry[] = [];

    for (const entry of entries) {
      // Check if the entry exists for the given boxType and priceRange
      const existingEntry = await this.boxWeightEntryRepository.findOne({
        where: { priceRange: entry.priceRange, boxType: entry.boxType },
      });

      if (existingEntry) {
        // Update totalBoxes for the existing entry
        existingEntry.totalBoxes = String(Number(existingEntry.totalBoxes) + entry.totalBoxes);
        const updatedEntry = await this.boxWeightEntryRepository.save(existingEntry);
        updatedEntries.push(updatedEntry);
      } else {
        // Handle multiple boxType entries across all ranges
        const otherRangeEntries = await this.boxWeightEntryRepository.find({
          where: { boxType: entry.boxType },
        });

        if (otherRangeEntries.length > 0) {
          for (const otherRangeEntry of otherRangeEntries) {
            // Update totalBoxes for all matching ranges
            otherRangeEntry.totalBoxes = String(Number(otherRangeEntry.totalBoxes) + entry.totalBoxes);
            const updatedOtherRangeEntry = await this.boxWeightEntryRepository.save(otherRangeEntry);
            updatedEntries.push(updatedOtherRangeEntry);
          }
        } else {
          // Create a new entry if no existing entry is found
          const newEntry = this.boxWeightEntryRepository.create(entry);
          const savedEntry = await this.boxWeightEntryRepository.save(newEntry);
          updatedEntries.push(savedEntry);
        }
      }
    }

    return updatedEntries;
  }
}