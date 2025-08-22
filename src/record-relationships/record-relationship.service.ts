import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  RecordRelationship,
  RelationshipType,
} from './entities/record-relationship.entity';
import { Record as RecordEntity } from '../records/entities/record.entity';
import {
  MovementTrackingService,
  TrackingContext,
} from '../record-movement-history/movement-tracking.service';
import {
  CreateRelationshipDto,
  RelationshipResponseDto,
  CreateRelationshipResponseDto,
  CreateChildRecordDto,
} from './dto/record-relationship.dto';

@Injectable()
export class RecordRelationshipService {
  private readonly logger = new Logger(RecordRelationshipService.name);

  constructor(
    @InjectRepository(RecordRelationship)
    private readonly relationshipRepository: Repository<RecordRelationship>,
    @InjectRepository(RecordEntity)
    private readonly recordRepository: Repository<RecordEntity>,
    private readonly movementTrackingService: MovementTrackingService,
  ) {}

  async createRelationship(
    createRelationshipDto: CreateRelationshipDto,
    userId: number,
    trackingContext: TrackingContext,
  ): Promise<CreateRelationshipResponseDto> {
    // Verificar que la línea padre existe
    const parentRecord = await this.recordRepository.findOne({
      where: { id: createRelationshipDto.parent_record_id },
    });

    if (!parentRecord) {
      throw new NotFoundException(
        `Línea de vida padre con ID ${createRelationshipDto.parent_record_id} no encontrada`,
      );
    }

    // Verificar que la línea padre no esté ya relacionada
    const existingRelation = await this.relationshipRepository.findOne({
      where: { parent_record_id: createRelationshipDto.parent_record_id },
    });

    if (existingRelation) {
      throw new BadRequestException(
        `La línea ${parentRecord.codigo} ya tiene líneas derivadas asociadas`,
      );
    }

    // Validar que hay al menos una línea hija
    if (createRelationshipDto.child_records.length === 0) {
      throw new BadRequestException(
        'Debe proporcionar al menos una línea nueva',
      );
    }

    // NUEVAS VALIDACIONES ADICIONALES
    await this.validateChildRecords(
      createRelationshipDto.child_records,
      parentRecord.codigo,
    );

    const createdRecords: RecordEntity[] = [];
    const createdRelationships: RecordRelationship[] = [];

    try {
      // Crear las nuevas líneas de vida
      for (const childData of createRelationshipDto.child_records) {
        // Verificar que el código no existe
        const existingRecord = await this.recordRepository.findOne({
          where: { codigo: childData.codigo },
        });

        if (existingRecord) {
          throw new BadRequestException(
            `Ya existe una línea con código: ${childData.codigo}`,
          );
        }

        // Crear nueva línea (childData ya es un CreateRecordDto completo)
        const newRecord = this.recordRepository.create({
          ...childData,
          estado_actual: childData.estado_actual || 'ACTIVO',
        });

        const savedRecord = await this.recordRepository.save(newRecord);
        createdRecords.push(savedRecord);

        // Crear relación
        const relationship = this.relationshipRepository.create({
          parent_record_id: createRelationshipDto.parent_record_id,
          child_record_id: savedRecord.id,
          relationship_type: createRelationshipDto.relationship_type,
          notes: createRelationshipDto.notes,
          created_by: userId,
        });

        const savedRelationship =
          await this.relationshipRepository.save(relationship);
        createdRelationships.push(savedRelationship);

        // Registrar creación en historial
        await this.movementTrackingService.trackRecordCreation(
          savedRecord,
          trackingContext,
        );
      }

      // Determinar nuevo estado de la línea padre
      const newParentStatus = this.getParentStatusByRelationType(
        createRelationshipDto.relationship_type,
      );

      // Actualizar estado de la línea padre
      await this.recordRepository.update(
        createRelationshipDto.parent_record_id,
        { estado_actual: newParentStatus },
      );

      // Registrar relación en historial de la línea padre
      await this.movementTrackingService.trackRecordUpdate(
        parentRecord.id,
        parentRecord.codigo,
        { estado_actual: parentRecord.estado_actual },
        { estado_actual: newParentStatus },
        trackingContext,
      );

      const message = this.generateSuccessMessage(
        createRelationshipDto.relationship_type,
        parentRecord.codigo,
        createdRecords.length,
      );

      this.logger.log(
        `Relación creada: ${parentRecord.codigo} → ${createdRecords.map((r) => r.codigo).join(', ')}`,
      );

      return {
        parent_record: {
          id: parentRecord.id,
          codigo: parentRecord.codigo,
          new_status: newParentStatus,
        },
        child_records: createdRecords.map((record) => ({
          id: record.id,
          codigo: record.codigo,
        })),
        relationships: createdRelationships.map((rel) =>
          this.mapToResponseDto(rel),
        ),
        message,
      };
    } catch (error) {
      // En caso de error, limpiar registros creados
      for (const record of createdRecords) {
        try {
          await this.recordRepository.delete(record.id);
        } catch (cleanupError) {
          this.logger.error(
            `Error limpiando registro ${record.id}:`,
            cleanupError,
          );
        }
      }
      throw error;
    }
  }

  async getChildRecords(
    parentRecordId: number,
  ): Promise<RelationshipResponseDto[]> {
    const relationships = await this.relationshipRepository.find({
      where: { parent_record_id: parentRecordId },
      relations: ['child_record', 'created_by_user'],
      order: { created_at: 'DESC' },
    });

    return relationships.map((rel) => this.mapToResponseDto(rel));
  }

  async getParentRecord(
    childRecordId: number,
  ): Promise<RelationshipResponseDto | null> {
    const relationship = await this.relationshipRepository.findOne({
      where: { child_record_id: childRecordId },
      relations: ['parent_record', 'created_by_user'],
    });

    if (!relationship) {
      return null;
    }

    return this.mapToResponseDto(relationship);
  }

  private getParentStatusByRelationType(type: RelationshipType): string {
    switch (type) {
      case RelationshipType.REPLACEMENT:
        return 'REEMPLAZADA';
      case RelationshipType.DIVISION:
        return 'DIVIDIDA';
      case RelationshipType.UPGRADE:
        return 'ACTUALIZADA';
      default:
        return 'INACTIVO';
    }
  }

  private generateSuccessMessage(
    type: RelationshipType,
    parentCode: string,
    childCount: number,
  ): string {
    switch (type) {
      case RelationshipType.REPLACEMENT:
        return `Línea ${parentCode} reemplazada exitosamente con ${childCount} nueva(s) línea(s)`;
      case RelationshipType.DIVISION:
        return `Línea ${parentCode} dividida exitosamente en ${childCount} nueva(s) línea(s)`;
      case RelationshipType.UPGRADE:
        return `Línea ${parentCode} actualizada exitosamente con ${childCount} nueva(s) línea(s)`;
      default:
        return `Relación creada exitosamente`;
    }
  }

  private mapToResponseDto(
    relationship: RecordRelationship,
  ): RelationshipResponseDto {
    return {
      id: relationship.id,
      parent_record_id: relationship.parent_record_id,
      child_record_id: relationship.child_record_id,
      relationship_type: relationship.relationship_type,
      notes: relationship.notes,
      created_at: relationship.created_at,
      created_by: relationship.created_by,
      parent_record: relationship.parent_record
        ? {
            id: relationship.parent_record.id,
            codigo: relationship.parent_record.codigo,
            cliente: relationship.parent_record.cliente || '',
            estado_actual: relationship.parent_record.estado_actual || '',
          }
        : undefined,
      child_record: relationship.child_record
        ? {
            id: relationship.child_record.id,
            codigo: relationship.child_record.codigo,
            cliente: relationship.child_record.cliente || '',
            estado_actual: relationship.child_record.estado_actual || '',
          }
        : undefined,
      created_by_user: relationship.created_by_user
        ? {
            id: relationship.created_by_user.id,
            nombre: relationship.created_by_user.nombre,
            apellidos: relationship.created_by_user.apellidos || '',
          }
        : undefined,
    };
  }

  /**
   * NUEVAS VALIDACIONES ADICIONALES
   */
  private async validateChildRecords(
    childRecords: CreateChildRecordDto[],
    parentCode: string,
  ): Promise<void> {
    // 1. Validar que ninguna línea nueva tenga el mismo código que la línea padre
    const selfReferenceFound = childRecords.some(
      (child) => child.codigo === parentCode,
    );

    if (selfReferenceFound) {
      throw new BadRequestException(
        `No se puede relacionar una línea consigo misma. El código "${parentCode}" no puede repetirse en las líneas nuevas.`,
      );
    }

    // 2. Validar que no haya códigos duplicados entre las líneas nuevas
    const childCodes = childRecords.map((child) => child.codigo);
    const duplicatedCodes = childCodes.filter(
      (codigo, index) => childCodes.indexOf(codigo) !== index,
    );

    if (duplicatedCodes.length > 0) {
      throw new BadRequestException(
        `Códigos duplicados encontrados en las líneas nuevas: ${duplicatedCodes.join(', ')}`,
      );
    }

    // 3. Validar que ninguna de las líneas nuevas ya esté vinculada como hija de otra línea
    for (const childRecord of childRecords) {
      // Buscar si ya existe un registro con este código
      const existingRecord = await this.recordRepository.findOne({
        where: { codigo: childRecord.codigo },
      });

      if (existingRecord) {
        // Si existe, verificar si ya está vinculado como línea hija
        const existingAsChild = await this.relationshipRepository.findOne({
          where: { child_record_id: existingRecord.id },
          relations: ['parent_record'],
        });

        if (existingAsChild) {
          throw new BadRequestException(
            `La línea "${childRecord.codigo}" ya está vinculada como línea derivada de "${existingAsChild.parent_record.codigo}". No se pueden asociar líneas que ya estén vinculadas a otra línea original.`,
          );
        }
      }
    }

    // 4. Validar que haya al menos un cambio significativo en las líneas nuevas
    // (opcional - para evitar crear líneas idénticas sin propósito)
    const hasSignificantChanges = childRecords.some(
      (child) =>
        child.longitud !== undefined ||
        child.ubicacion !== undefined ||
        child.cliente !== undefined ||
        child.equipo !== undefined,
    );

    if (!hasSignificantChanges && childRecords.length === 1) {
      this.logger.warn(
        `Creando línea derivada sin cambios significativos para ${parentCode}`,
      );
      // Solo warning, no error - permitir el caso de uso
    }
  }

  /**
   * Validar si una línea puede ser utilizada como padre
   */
  async canBeParent(recordId: number): Promise<{
    canBeParent: boolean;
    reason?: string;
    currentStatus?: string;
    hasChildren?: boolean;
  }> {
    const record = await this.recordRepository.findOne({
      where: { id: recordId },
    });

    if (!record) {
      return {
        canBeParent: false,
        reason: 'Línea de vida no encontrada',
      };
    }

    // Verificar si ya tiene líneas derivadas
    const hasChildren = await this.relationshipRepository.findOne({
      where: { parent_record_id: recordId },
    });

    if (hasChildren) {
      return {
        canBeParent: false,
        reason: 'Esta línea ya tiene líneas derivadas asociadas',
        currentStatus: record.estado_actual,
        hasChildren: true,
      };
    }

    // Verificar si es una línea derivada de otra
    const isChild = await this.relationshipRepository.findOne({
      where: { child_record_id: recordId },
    });

    if (isChild) {
      return {
        canBeParent: false,
        reason:
          'Esta línea es derivada de otra línea. Solo las líneas originales pueden generar derivadas.',
        currentStatus: record.estado_actual,
        hasChildren: false,
      };
    }

    // Verificar estados que no permiten derivación
    const forbiddenStates = ['REEMPLAZADA', 'DIVIDIDA', 'ACTUALIZADA'];
    if (forbiddenStates.includes(record.estado_actual || '')) {
      return {
        canBeParent: false,
        reason: `Las líneas con estado "${record.estado_actual}" no pueden generar nuevas derivadas`,
        currentStatus: record.estado_actual,
        hasChildren: false,
      };
    }

    return {
      canBeParent: true,
      currentStatus: record.estado_actual,
      hasChildren: false,
    };
  }
}
