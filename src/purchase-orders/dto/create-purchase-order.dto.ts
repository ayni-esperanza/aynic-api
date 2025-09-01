import { IsString, IsNumber, IsOptional, IsDateString, IsEnum } from 'class-validator';
import { PurchaseOrderType, PurchaseOrderStatus } from '../entities/purchase-order.entity';

export class CreatePurchaseOrderDto {
  @IsString()
  codigo: string;

  @IsString()
  descripcion: string;

  @IsEnum(PurchaseOrderType)
  tipo: PurchaseOrderType;

  @IsNumber()
  monto_total: number;

  @IsOptional()
  @IsString()
  proveedor?: string;

  @IsOptional()
  @IsString()
  observaciones?: string;

  @IsOptional()
  @IsDateString()
  fecha_requerida?: string;
}
