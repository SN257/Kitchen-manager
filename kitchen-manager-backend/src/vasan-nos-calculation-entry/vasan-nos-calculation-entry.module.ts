import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VasanNosCalculationEntry } from '../entities/vasan-nos-calculation-entry.entity';
import { Event } from '../entities/event.entity';
import { VasanNosCalculationEntryService } from './vasan-nos-calculation-entry.service';
import { VasanNosCalculationEntryController } from './vasan-nos-calculation-entry.controller';

@Module({
  imports: [TypeOrmModule.forFeature([VasanNosCalculationEntry, Event])],
  providers: [VasanNosCalculationEntryService],
  controllers: [VasanNosCalculationEntryController],
})
export class VasanNosCalculationEntryModule {}
