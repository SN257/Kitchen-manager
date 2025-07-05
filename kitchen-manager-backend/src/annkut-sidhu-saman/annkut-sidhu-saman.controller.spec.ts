import { Test, TestingModule } from '@nestjs/testing';
import { AnnkutSidhuSamanController } from './annkut-sidhu-saman.controller';

describe('AnnkutSidhuSamanController', () => {
  let controller: AnnkutSidhuSamanController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnnkutSidhuSamanController],
    }).compile();

    controller = module.get<AnnkutSidhuSamanController>(
      AnnkutSidhuSamanController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
