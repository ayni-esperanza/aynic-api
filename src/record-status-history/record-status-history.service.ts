import { Injectable } from '@nestjs/common';
import { CreateRecordStatusHistoryDto } from './dto/create-record-status-history.dto';
import { UpdateRecordStatusHistoryDto } from './dto/update-record-status-history.dto';

@Injectable()
export class RecordStatusHistoryService {
  create(createRecordStatusHistoryDto: CreateRecordStatusHistoryDto) {
    return 'This action adds a new recordStatusHistory';
  }

  findAll() {
    return `This action returns all recordStatusHistory`;
  }

  findOne(id: number) {
    return `This action returns a #${id} recordStatusHistory`;
  }

  update(
    id: number,
    updateRecordStatusHistoryDto: UpdateRecordStatusHistoryDto,
  ) {
    return `This action updates a #${id} recordStatusHistory`;
  }

  remove(id: number) {
    return `This action removes a #${id} recordStatusHistory`;
  }
}
