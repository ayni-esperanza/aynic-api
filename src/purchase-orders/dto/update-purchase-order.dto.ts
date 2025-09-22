import { PartialType } from '@nestjs/mapped-types';
import { CreatePurchaseOrderDto } from './create-purchase-order.dto';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdatePurchaseOrderDto extends PartialType(CreatePurchaseOrderDto) {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  numero?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  termino_referencias?: string;
}
