import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PurchaseOrdersService } from './purchase-orders.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/auth.decorators';
import { PurchaseOrder } from './entities/purchase-order.entity';

@Controller('purchase-orders')
@UseGuards(SessionAuthGuard, RolesGuard)
export class PurchaseOrdersController {
  constructor(private readonly purchaseOrdersService: PurchaseOrdersService) {}

  @Post()
  @Roles('ADMINISTRADOR', 'USUARIO')
  create(@Body() createPurchaseOrderDto: CreatePurchaseOrderDto) {
    return this.purchaseOrdersService.create(createPurchaseOrderDto);
  }

  @Get()
  @Roles('ADMINISTRADOR', 'USUARIO')
  findAll() {
    return this.purchaseOrdersService.findAll();
  }

  // Rutas legacy de estado y tipo eliminadas

  @Get(':id')
  @Roles('ADMINISTRADOR', 'USUARIO')
  findOne(@Param('id') id: string) {
    return this.purchaseOrdersService.findOne(+id);
  }

  @Patch(':id')
  @Roles('ADMINISTRADOR', 'USUARIO')
  update(
    @Param('id') id: string,
    @Body() updatePurchaseOrderDto: UpdatePurchaseOrderDto,
  ) {
    return this.purchaseOrdersService.update(+id, updatePurchaseOrderDto);
  }

  @Delete(':id')
  @Roles('ADMINISTRADOR')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.purchaseOrdersService.remove(+id);
  }
}
