import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UseInterceptors } from '@nestjs/common';
import { TrackingInterceptor } from '../record-movement-history/tracking.interceptor';
import { RecordRelationshipService } from './record-relationship.service';
import {
  CreateRelationshipDto,
  RelationshipResponseDto,
  CreateRelationshipResponseDto,
} from './dto/record-relationship.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  Roles,
  CurrentUser,
  AuthenticatedUser,
} from '../auth/decorators/auth.decorators';
import { TrackingContext } from '../record-movement-history/movement-tracking.service';

@ApiTags('record-relationships')
@Controller('record-relationships')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(TrackingInterceptor)
@ApiBearerAuth()
export class RecordRelationshipController {
  constructor(
    private readonly recordRelationshipService: RecordRelationshipService,
  ) {}

  private getTrackingContext(request: any, user: any): TrackingContext {
    return {
      userId: user?.userId,
      username: user?.username,
      ipAddress: request?.trackingContext?.ipAddress,
      userAgent: request?.trackingContext?.userAgent,
    };
  }

  @Post()
  @Roles('ADMINISTRADOR', 'USUARIO')
  @ApiOperation({
    summary: 'Crear relación entre línea antigua y nuevas líneas derivadas',
  })
  @ApiResponse({
    status: 201,
    description: 'Relación creada exitosamente',
    type: CreateRelationshipResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Línea padre no encontrada' })
  @ApiResponse({
    status: 400,
    description: 'Error de validación o línea ya relacionada',
  })
  async createRelationship(
    @Body() createRelationshipDto: CreateRelationshipDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: any,
  ): Promise<CreateRelationshipResponseDto> {
    const trackingContext = this.getTrackingContext(request, user);
    return this.recordRelationshipService.createRelationship(
      createRelationshipDto,
      user.userId,
      trackingContext,
    );
  }

  @Get('children/:parentRecordId')
  @Roles('ADMINISTRADOR', 'USUARIO')
  @ApiOperation({
    summary: 'Obtener líneas derivadas de una línea padre',
  })
  @ApiParam({ name: 'parentRecordId', description: 'ID de la línea padre' })
  @ApiResponse({
    status: 200,
    description: 'Líneas derivadas obtenidas exitosamente',
    type: [RelationshipResponseDto],
  })
  getChildRecords(
    @Param('parentRecordId', ParseIntPipe) parentRecordId: number,
  ): Promise<RelationshipResponseDto[]> {
    return this.recordRelationshipService.getChildRecords(parentRecordId);
  }

  @Get('parent/:childRecordId')
  @Roles('ADMINISTRADOR', 'USUARIO')
  @ApiOperation({
    summary: 'Obtener línea padre de una línea derivada',
  })
  @ApiParam({ name: 'childRecordId', description: 'ID de la línea derivada' })
  @ApiResponse({
    status: 200,
    description: 'Línea padre obtenida exitosamente',
    type: RelationshipResponseDto,
  })
  @ApiResponse({ status: 404, description: 'No tiene línea padre' })
  getParentRecord(
    @Param('childRecordId', ParseIntPipe) childRecordId: number,
  ): Promise<RelationshipResponseDto | null> {
    return this.recordRelationshipService.getParentRecord(childRecordId);
  }

  @Get('can-be-parent/:recordId')
  @Roles('ADMINISTRADOR', 'USUARIO')
  @ApiOperation({
    summary:
      'Verificar si una línea puede ser utilizada como padre para derivadas',
  })
  @ApiParam({ name: 'recordId', description: 'ID de la línea a verificar' })
  @ApiResponse({
    status: 200,
    description: 'Estado de elegibilidad verificado',
    schema: {
      type: 'object',
      properties: {
        canBeParent: { type: 'boolean' },
        reason: { type: 'string' },
        currentStatus: { type: 'string' },
        hasChildren: { type: 'boolean' },
      },
    },
  })
  async canBeParent(
    @Param('recordId', ParseIntPipe) recordId: number,
  ): Promise<{
    canBeParent: boolean;
    reason?: string;
    currentStatus?: string;
    hasChildren?: boolean;
  }> {
    return this.recordRelationshipService.canBeParent(recordId);
  }
}
