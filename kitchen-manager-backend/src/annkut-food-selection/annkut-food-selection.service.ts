import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnnkutFoodSelection } from '../entities/annkut-food-selection.entity';
import { Event } from '../entities/event.entity';
import { User } from '../entities/users.entity';
import { CreateAnnkutFoodSelectionDto } from './dto/create-annkut-food-selection.dto';

@Injectable()
export class AnnkutFoodSelectionService {
  constructor(
    @InjectRepository(AnnkutFoodSelection)
    private readonly repo: Repository<AnnkutFoodSelection>,
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
  @InjectRepository(User)
  private readonly userRepo: Repository<User>,
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

  async findByCenterAndEvent(center: string, eventId?: number) {
    console.log(`[annkut-food-selection.service] findByCenterAndEvent center='${center}', eventId=${eventId}`);
    try {
      const matchingUsers = await this.userRepo
        .createQueryBuilder('u')
        .where('LOWER(TRIM(u.center)) = LOWER(TRIM(:center))', { center })
        .getMany();
      console.log('[annkut-food-selection.service] matching user ids for center=', matchingUsers.map(u => u.id));
    } catch (err) {
      console.log('[annkut-food-selection.service] user lookup error', err && err.message);
    }
    // Use QueryBuilder to join the selection creator and filter by the creator's center
    // When a sant selects a center we want to show selections created by users whose `center` equals the selected center
    const qb = this.repo.createQueryBuilder('selection')
      .leftJoinAndSelect('selection.event', 'event')
      // join creator user record on selection.userId so we can filter by creator.center
      .leftJoin(User, 'creator', 'creator.id = selection.userId')
      // compare trimmed, case-insensitive to avoid minor mismatches on creator.center
      .where('LOWER(TRIM(creator.center)) = LOWER(TRIM(:center))', { center });

    if (typeof eventId !== 'undefined') {
      qb.andWhere('selection.eventId = :eventId', { eventId });
    }

  console.log('[annkut-food-selection.service] SQL:', qb.getSql());
  const results = await qb.getMany();
  console.log('[annkut-food-selection.service] results.length=', Array.isArray(results) ? results.length : 0);
  return results;
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
