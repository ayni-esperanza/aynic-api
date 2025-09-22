import { PartialType } from '@nestjs/mapped-types';
import { CreateRecordDto } from './create-record.dto';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateRecordDto extends PartialType(CreateRecordDto) {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  purchase_order_num?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  purchase_order_termino_referencias?: string;
}
