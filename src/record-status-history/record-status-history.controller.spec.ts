import { Test, TestingModule } from '@nestjs/testing';
import { RecordStatusHistoryController } from './record-status-history.controller';
import { RecordStatusHistoryService } from './record-status-history.service';

describe('RecordStatusHistoryController', () => {
  let controller: RecordStatusHistoryController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecordStatusHistoryController],
      providers: [RecordStatusHistoryService],
    }).compile();

    controller = module.get<RecordStatusHistoryController>(RecordStatusHistoryController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
