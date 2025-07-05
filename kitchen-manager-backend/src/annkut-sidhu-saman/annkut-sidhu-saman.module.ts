import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnnkutSidhuSamanService } from './annkut-sidhu-saman.service';
import { AnnkutSidhuSamanController } from './annkut-sidhu-saman.controller';
import { AnnkutSidhuSaman } from '../entities/annkut-sidhu-saman.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AnnkutSidhuSaman])],
  controllers: [AnnkutSidhuSamanController],
  providers: [AnnkutSidhuSamanService],
})
export class AnnkutSidhuSamanModule {}
