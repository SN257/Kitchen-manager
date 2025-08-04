import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BoxRangeController } from './box-range.controller';
import { BoxRangeService } from './box-range.service';
import { BoxRange } from '../entities/box-range.entity';
import { Event } from '../entities/event.entity';

@Module({
  imports: [TypeOrmModule.forFeature([BoxRange, Event])],
  controllers: [BoxRangeController],
  providers: [BoxRangeService],
})
export class BoxRangeModule {}
