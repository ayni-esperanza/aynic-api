import { Test, TestingModule } from '@nestjs/testing';
import { RecordStatusHistoryService } from './record-status-history.service';

describe('RecordStatusHistoryService', () => {
  let service: RecordStatusHistoryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RecordStatusHistoryService],
    }).compile();

    service = module.get<RecordStatusHistoryService>(RecordStatusHistoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
