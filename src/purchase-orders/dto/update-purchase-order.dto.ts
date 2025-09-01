import { PartialType } from '@nestjs/mapped-types';
import { CreatePurchaseOrderDto } from './create-purchase-order.dto';
import { IsOptional, IsEnum, IsDateString } from 'class-validator';
import { PurchaseOrderStatus } from '../entities/purchase-order.entity';
import { User } from '../../users/entities/user.entity';

export class UpdatePurchaseOrderDto extends PartialType(CreatePurchaseOrderDto) {
  @IsOptional()
  @IsEnum(PurchaseOrderStatus)
  estado?: PurchaseOrderStatus;

  @IsOptional()
  @IsDateString()
  fecha_aprobacion?: string;

  @IsOptional()
  aprobador?: User;
}
