import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vasan } from '../entities/vasan.entity';
import { Event } from '../entities/event.entity';
import { VasanService } from './vasan.service';
import { VasanController } from './vasan.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Vasan, Event])],
  providers: [VasanService],
  controllers: [VasanController],
})
export class VasanModule {}
