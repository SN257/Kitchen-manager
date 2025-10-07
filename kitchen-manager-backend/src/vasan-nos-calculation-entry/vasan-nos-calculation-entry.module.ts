import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VasanNosCalculationEntry } from '../entities/vasan-nos-calculation-entry.entity';
import { Event } from '../entities/event.entity';
import { VasanNosCalculationEntryService } from './vasan-nos-calculation-entry.service';
import { VasanNosCalculationEntryController } from './vasan-nos-calculation-entry.controller';
import { VasanFillPlanModule } from '../vasan-fill-plan/vasan-fill-plan.module';
import { RecipesModule } from '../recipes/recipes.module';
import { WeightEntryModule } from '../weight-entry/weight-entry.module';
import { SectionVasanSummaryModule } from '../section-vasan-summary/section-vasan-summary.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([VasanNosCalculationEntry, Event]),
    VasanFillPlanModule,
    RecipesModule,
    WeightEntryModule,
    SectionVasanSummaryModule,
  ],
  providers: [VasanNosCalculationEntryService],
  controllers: [VasanNosCalculationEntryController],
  exports: [VasanNosCalculationEntryService],
})
export class VasanNosCalculationEntryModule {}
