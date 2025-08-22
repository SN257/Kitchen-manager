import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinalNosSummary } from '../entities/final-nos-summary.entity';
import { FinalNosSummaryService } from './final-nos-summary.service';
import { FinalNosSummaryController } from './final-nos-summary.controller';

@Module({
  imports: [TypeOrmModule.forFeature([FinalNosSummary])],
  controllers: [FinalNosSummaryController],
  providers: [FinalNosSummaryService],
  exports: [FinalNosSummaryService],
})
export class FinalNosSummaryModule {}
