import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnnkutSidhuSaman } from '../entities/annkut-sidhu-saman.entity';
import { Event } from '../entities/event.entity';
import { AnnkutSidhuSamanService } from './annkut-sidhu-saman.service';
import { AnnkutSidhuSamanController } from './annkut-sidhu-saman.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AnnkutSidhuSaman, Event])],
  providers: [AnnkutSidhuSamanService],
  controllers: [AnnkutSidhuSamanController],
  exports: [AnnkutSidhuSamanService],
})
export class AnnkutSidhuSamanModule {}
