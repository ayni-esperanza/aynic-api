import { PartialType } from '@nestjs/mapped-types';
import { CreateRecordStatusHistoryDto } from './create-record-status-history.dto';

export class UpdateRecordStatusHistoryDto extends PartialType(CreateRecordStatusHistoryDto) {}
