import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { Record } from '../records/entities/record.entity';
import { RecordStatusHistory } from '../record-status-history/entities/record-status-history.entity';
import { Alert } from '../alerts/entities/alert.entity';
import { RecordImage } from '../record-images/entities/record-image.entity';
import { RecordMovementHistory } from '../record-movement-history/entities/record-movement-history.entity';
import { Accident } from '../accidents/entities/accident.entity';
import { AuthorizationCode } from '../authorization-codes/entities/authorization-code.entity';
import { Maintenance } from '../maintenance/entities/maintenance.entity';
import { RecordRelationship } from '../record-relationships/entities/record-relationship.entity';
import { UserSession } from '../auth/entities/user-session.entity';

export const getDatabaseConfig = (config: ConfigService): TypeOrmModuleOptions => {
  const host = config.get<string>('DB_HOST') ?? 'localhost';
  const port = +(config.get<number>('DB_PORT') ?? 5432);
  const isProduction = config.get('NODE_ENV') === 'production';
  
  // LOG TEMPORAL para debug
  console.log('🔍 === DEBUG VARIABLES DE ENTORNO ===');
  console.log(' NODE_ENV:', config.get('NODE_ENV'));
  console.log(' DB_HOST:', config.get('DB_HOST'));
  console.log(' DB_PORT:', config.get('DB_PORT'));
  console.log(' DB_USERNAME:', config.get('DB_USERNAME'));
  console.log(' DB_DATABASE:', config.get('DB_DATABASE'));
  console.log(' DB_SSL_ENABLED:', config.get('DB_SSL_ENABLED'));
  console.log(' JWT_SECRET:', config.get('JWT_SECRET') ? '✅ SET' : '❌ NOT SET');
  console.log(' R2_BUCKET_NAME:', config.get('R2_BUCKET_NAME'));
  console.log(' isProduction:', isProduction);
  console.log('🔍 synchronize:', isProduction ? false : true);
  console.log('🔍 === FIN DEBUG ===');
  
  // Configuración SSL simplificada usando DB_SSL_ENABLED
  const sslEnabled = config.get('DB_SSL_ENABLED') === 'true';
  const enableSSL = sslEnabled ? { rejectUnauthorized: false } : false;

  const baseConfig = {
    type: 'postgres' as const,
    host,
    port,
    username: config.get('DB_USERNAME'),
    password: config.get('DB_PASSWORD'),
    database: config.get('DB_DATABASE'),
    entities: [
      User,
      Record,
      RecordStatusHistory,
      Alert,
      RecordImage,
      RecordMovementHistory,
      Accident,
      AuthorizationCode,
      Maintenance,
      RecordRelationship,
      UserSession,
    ],
    autoLoadEntities: true,
    ssl: enableSSL,
  };

  if (isProduction) {
    // Configuración para PRODUCCIÓN
    return {
      ...baseConfig,
      synchronize: true, // Usar synchronize en lugar de migraciones
      logging: ['error', 'warn'], // Logging limitado para producción
    };
  } else {
    // Configuración para DESARROLLO
    return {
      ...baseConfig,
      synchronize: true, // para desarrollo
      logging: ['query', 'error', 'warn'], // Logging completo para desarrollo
    };
  }
};
