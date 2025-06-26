import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BoxRange } from '../entities/box-range.entity';
import { BoxRangeService } from './box-range.service';
import { BoxRangeController } from './box-range.controller';

@Module({
    imports: [TypeOrmModule.forFeature([BoxRange])],
    providers: [BoxRangeService],
    controllers: [BoxRangeController],
})
export class BoxRangeModule {}