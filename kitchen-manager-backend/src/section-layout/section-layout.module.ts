import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SectionLayout } from '../entities/section-layout.entity';
import { SectionLayoutService } from './section-layout.service';
import { SectionLayoutController } from './section-layout.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SectionLayout])],
  providers: [SectionLayoutService],
  controllers: [SectionLayoutController],
})
export class SectionLayoutModule {}
