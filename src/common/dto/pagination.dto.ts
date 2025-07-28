import { IsOptional, IsInt, Min, Max, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PaginationDto {
  @ApiProperty({
    description: 'Número de página (empezando desde 1)',
    default: 1,
    minimum: 1,
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiProperty({
    description: 'Número de elementos por página',
    default: 10,
    minimum: 1,
    maximum: 100,
    example: 10,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiProperty({
    description: 'Campo para ordenar los resultados',
    required: false,
    example: 'id',
  })
  @IsOptional()
  sortBy?: string;

  @ApiProperty({
    description: 'Dirección del ordenamiento',
    enum: ['ASC', 'DESC'],
    default: 'ASC',
    required: false,
  })
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';

  // Métodos helper con valores seguros
  getPage(): number {
    return this.page && this.page > 0 ? this.page : 1;
  }

  getLimit(): number {
    return this.limit && this.limit > 0 && this.limit <= 100 ? this.limit : 10;
  }

  getSortBy(): string {
    return this.sortBy || 'id';
  }

  getSortOrder(): 'ASC' | 'DESC' {
    return this.sortOrder || 'ASC';
  }

  getOffset(): number {
    return (this.getPage() - 1) * this.getLimit();
  }
}
