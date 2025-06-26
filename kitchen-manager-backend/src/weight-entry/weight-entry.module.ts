import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WeightEntry } from '../entities/weight_entry.entity';
import { WeightEntryService } from './weight-entry.service';
import { WeightEntryController } from './weight-entry.controller';

@Module({
  imports: [TypeOrmModule.forFeature([WeightEntry])],
  providers: [WeightEntryService],
  controllers: [WeightEntryController],
})
export class WeightEntryModule {}