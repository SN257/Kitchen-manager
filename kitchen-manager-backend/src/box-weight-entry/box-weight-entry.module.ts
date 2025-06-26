import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BoxWeightEntry } from '../entities/box-weight-entry.entity';
import { BoxWeightEntryService } from './box-weight-entry.service';
import { BoxWeightEntryController } from './box-weight-entry.controller';

@Module({
  imports: [TypeOrmModule.forFeature([BoxWeightEntry])],
  providers: [BoxWeightEntryService],
  controllers: [BoxWeightEntryController],
})
export class BoxWeightEntryModule {}