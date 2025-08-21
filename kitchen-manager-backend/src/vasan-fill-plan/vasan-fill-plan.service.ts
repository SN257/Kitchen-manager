import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VasanFillPlan } from '../entities/vasan-fill-plan.entity';
import { CreateVasanFillPlanDto } from './dto/create-vasan-fill-plan.dto';
import { Vasan } from '../entities/vasan.entity';

@Injectable()
export class VasanFillPlanService {
  constructor(
    @InjectRepository(VasanFillPlan) private readonly repo: Repository<VasanFillPlan>,
    @InjectRepository(Vasan) private readonly vasanRepo: Repository<Vasan>,
  ) {}

  async create(dto: CreateVasanFillPlanDto, userId: number) {
    const vasan = await this.vasanRepo.findOne({ where: { id: dto.vasanId, userId } });
    if (!vasan) throw new NotFoundException('Vasan not found or access denied');
    const plan = this.repo.create({ ...dto, userId });
    return this.repo.save(plan);
  }

  async findAll(eventId: number | undefined, userId: number) {
    const where: any = { userId };
    if (eventId) where.eventId = eventId;
    return this.repo.find({ where, order: { id: 'ASC' } });
  }

  async update(id: number, dto: CreateVasanFillPlanDto, userId: number) {
    const existing = await this.repo.findOne({ where: { id, userId } });
    if (!existing) throw new NotFoundException('Plan not found or access denied');
    if (dto.vasanId && dto.vasanId !== existing.vasanId) {
      const vasan = await this.vasanRepo.findOne({ where: { id: dto.vasanId, userId } });
      if (!vasan) throw new UnauthorizedException('Vasan not found or access denied');
    }
    Object.assign(existing, dto);
    return this.repo.save(existing);
  }

  async remove(id: number, userId: number) {
    const existing = await this.repo.findOne({ where: { id, userId } });
    if (!existing) throw new NotFoundException('Plan not found or access denied');
    await this.repo.remove(existing);
    return { deleted: true };
  }
}
