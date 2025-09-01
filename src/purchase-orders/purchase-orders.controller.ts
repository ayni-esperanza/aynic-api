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
} from '@nestjs/common';
import { PurchaseOrdersService } from './purchase-orders.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/auth.decorators';
import { PurchaseOrderStatus, PurchaseOrderType } from './entities/purchase-order.entity';

@Controller('purchase-orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PurchaseOrdersController {
  constructor(private readonly purchaseOrdersService: PurchaseOrdersService) {}

  @Post()
  @Roles('ADMINISTRADOR', 'USUARIO')
  create(@Body() createPurchaseOrderDto: CreatePurchaseOrderDto, @Request() req) {
    return this.purchaseOrdersService.create(createPurchaseOrderDto, req.user.id);
  }

  @Get()
  @Roles('ADMINISTRADOR', 'USUARIO')
  findAll() {
    return this.purchaseOrdersService.findAll();
  }

  @Get('status/:status')
  @Roles('ADMINISTRADOR', 'USUARIO')
  findByStatus(@Param('status') status: PurchaseOrderStatus) {
    return this.purchaseOrdersService.findByStatus(status);
  }

  @Get('type/:type')
  @Roles('ADMINISTRADOR', 'USUARIO')
  findByType(@Param('type') type: PurchaseOrderType) {
    return this.purchaseOrdersService.findByType(type);
  }

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
    @Request() req,
  ) {
    return this.purchaseOrdersService.update(+id, updatePurchaseOrderDto, req.user.id);
  }

  @Delete(':id')
  @Roles('ADMINISTRADOR')
  remove(@Param('id') id: string) {
    return this.purchaseOrdersService.remove(+id);
  }
}
