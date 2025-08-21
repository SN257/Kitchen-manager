import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VasanFillPlan } from '../entities/vasan-fill-plan.entity';
import { Vasan } from '../entities/vasan.entity';
import { VasanFillPlanService } from './vasan-fill-plan.service';
import { VasanFillPlanController } from './vasan-fill-plan.controller';

@Module({
  imports: [TypeOrmModule.forFeature([VasanFillPlan, Vasan])],
  controllers: [VasanFillPlanController],
  providers: [VasanFillPlanService],
})
export class VasanFillPlanModule {}
