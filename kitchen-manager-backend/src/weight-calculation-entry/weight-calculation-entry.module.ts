import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WeightCalculationEntry } from '../entities/weight-calculation-entry.entity';
import { Event } from '../entities/event.entity';
import { WeightCalculationEntryService } from './weight-calculation-entry.service';
import { WeightCalculationEntryController } from './weight-calculation-entry.controller';

@Module({
  imports: [TypeOrmModule.forFeature([WeightCalculationEntry, Event])],
  providers: [WeightCalculationEntryService],
  controllers: [WeightCalculationEntryController],
})
export class WeightCalculationEntryModule {}
