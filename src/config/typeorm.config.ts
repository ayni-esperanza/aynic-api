import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
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

const configService = new ConfigService();

const host = configService.get<string>('DB_HOST') ?? 'localhost';
const port = +(configService.get<number>('DB_PORT') ?? 5432);

// Configuración SSL simplificada usando DB_SSL_ENABLED
const sslEnabled = configService.get('DB_SSL_ENABLED') === 'true';
const enableSSL = sslEnabled ? { rejectUnauthorized: false } : false;

export default new DataSource({
  type: 'postgres',
  host,
  port,
  username: configService.get('DB_USERNAME'),
  password: configService.get('DB_PASSWORD'),
  database: configService.get('DB_DATABASE'),
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
  ssl: enableSSL,
});
