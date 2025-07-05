import { Test, TestingModule } from '@nestjs/testing';
import { AnnkutSidhuSamanService } from './annkut-sidhu-saman.service';

describe('AnnkutSidhuSamanService', () => {
  let service: AnnkutSidhuSamanService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AnnkutSidhuSamanService],
    }).compile();

    service = module.get<AnnkutSidhuSamanService>(AnnkutSidhuSamanService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
