import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  registerDecorator,
  ValidationOptions,
} from 'class-validator';

/**
 * Validador para verificar que la fecha de vencimiento sea posterior a la fecha de instalación
 */
@ValidatorConstraint({ name: 'isAfterInstallationDate', async: false })
export class IsAfterInstallationDateConstraint
  implements ValidatorConstraintInterface
{
  validate(fechaVencimiento: any, args: ValidationArguments): boolean {
    if (!fechaVencimiento) return true; // Si no hay fecha de vencimiento, no validar

    const object = args.object as any;
    const fechaInstalacion = object.fecha_instalacion;

    if (!fechaInstalacion) return true; // Si no hay fecha de instalación, no validar

    const instalacion = new Date(fechaInstalacion);
    const vencimiento = new Date(fechaVencimiento);

    return vencimiento > instalacion;
  }

  defaultMessage(): string {
    return 'La fecha de vencimiento debe ser posterior a la fecha de instalación';
  }
}

/**
 * Decorador para validar fechas de vencimiento
 */
export function IsAfterInstallationDate(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsAfterInstallationDateConstraint,
    });
  };
}

/**
 * Validador para fechas no futuras ilógicas (más de 50 años en el futuro)
 */
@ValidatorConstraint({ name: 'isReasonableFutureDate', async: false })
export class IsReasonableFutureDateConstraint
  implements ValidatorConstraintInterface
{
  validate(date: any): boolean {
    if (!date) return true; // Si no hay fecha, no validar

    const inputDate = new Date(date);
    const maxFutureDate = new Date();
    maxFutureDate.setFullYear(maxFutureDate.getFullYear() + 50); // Máximo 50 años en el futuro

    return inputDate <= maxFutureDate;
  }

  defaultMessage(): string {
    return 'La fecha no puede ser más de 50 años en el futuro';
  }
}

/**
 * Decorador para validar fechas futuras razonables
 */
export function IsReasonableFutureDate(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsReasonableFutureDateConstraint,
    });
  };
}

/**
 * Validador para fechas de instalación no muy antiguas (máximo 100 años atrás)
 */
@ValidatorConstraint({ name: 'isReasonablePastDate', async: false })
export class IsReasonablePastDateConstraint
  implements ValidatorConstraintInterface
{
  validate(date: any): boolean {
    if (!date) return true; // Si no hay fecha, no validar

    const inputDate = new Date(date);
    const minPastDate = new Date();
    minPastDate.setFullYear(minPastDate.getFullYear() - 100); // Máximo 100 años atrás

    return inputDate >= minPastDate;
  }

  defaultMessage(): string {
    return 'La fecha de instalación no puede ser más de 100 años en el pasado';
  }
}

/**
 * Decorador para validar fechas pasadas razonables
 */
export function IsReasonablePastDate(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsReasonablePastDateConstraint,
    });
  };
}

/**
 * Validador para estados válidos del sistema
 */
@ValidatorConstraint({ name: 'isValidRecordStatus', async: false })
export class IsValidRecordStatusConstraint
  implements ValidatorConstraintInterface
{
  private readonly validStatuses = [
    'ACTIVO',
    'POR_VENCER',
    'VENCIDO',
    'INACTIVO',
    'MANTENIMIENTO',
  ];

  validate(status: any): boolean {
    if (!status) return true; // Si no hay estado, no validar (será manejado por @IsOptional)

    return this.validStatuses.includes(status.toString().toUpperCase());
  }

  defaultMessage(): string {
    return `El estado debe ser uno de: ${this.validStatuses.join(', ')}`;
  }
}

/**
 * Decorador para validar estados de registros
 */
export function IsValidRecordStatus(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidRecordStatusConstraint,
    });
  };
}

/**
 * Validador para años de vida útil razonables (1-100 años)
 */
@ValidatorConstraint({ name: 'isReasonableLifespan', async: false })
export class IsReasonableLifespanConstraint
  implements ValidatorConstraintInterface
{
  validate(years: any): boolean {
    if (years === null || years === undefined) return true; // Si no hay valor, no validar

    const numYears = Number(years);
    return numYears >= 1 && numYears <= 100;
  }

  defaultMessage(): string {
    return 'Los años de vida útil deben estar entre 1 y 100';
  }
}

/**
 * Decorador para validar años de vida útil
 */
export function IsReasonableLifespan(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsReasonableLifespanConstraint,
    });
  };
}

/**
 * Validador para meses de vida útil razonables (1-11 meses)
 */
@ValidatorConstraint({ name: 'isValidMonths', async: false })
export class IsValidMonthsConstraint implements ValidatorConstraintInterface {
  validate(months: any): boolean {
    if (months === null || months === undefined) return true; // Si no hay valor, no validar

    const numMonths = Number(months);
    return numMonths >= 0 && numMonths <= 11;
  }

  defaultMessage(): string {
    return 'Los meses de vida útil deben estar entre 0 y 11';
  }
}

/**
 * Decorador para validar meses de vida útil
 */
export function IsValidMonths(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidMonthsConstraint,
    });
  };
}
