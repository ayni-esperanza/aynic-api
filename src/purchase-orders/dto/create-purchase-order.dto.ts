import { IsString, IsOptional, MaxLength } from 'class-validator';

export class CreatePurchaseOrderDto {
  @IsString()
  @MaxLength(50)
  numero: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  termino_referencias?: string;
}
