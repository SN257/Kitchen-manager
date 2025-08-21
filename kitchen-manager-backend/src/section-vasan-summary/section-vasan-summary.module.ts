import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SectionVasanSummary } from '../entities/section-vasan-summary.entity';
import { SectionVasanSummaryService } from './section-vasan-summary.service';
import { SectionVasanSummaryController } from './section-vasan-summary.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SectionVasanSummary])],
  controllers: [SectionVasanSummaryController],
  providers: [SectionVasanSummaryService],
  exports: [SectionVasanSummaryService]
})
export class SectionVasanSummaryModule {}
