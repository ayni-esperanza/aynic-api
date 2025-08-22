import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Record } from './entities/record.entity';
import { User } from '../users/entities/user.entity';
import { RecordsService } from './records.service';
import { RecordsController } from './records.controller';
import { ScheduleModule } from '../schedules/schedules.module';
import { RecordImagesModule } from '../record-images/record-images.module';
import { RecordMovementHistoryModule } from '../record-movement-history/record-movement-history.module';
import { AuthModule } from '../auth/auth.module';
import { AuthorizationCodeModule } from '../authorization-codes/authorization-code.module';
import { EmpresaPermissionsService } from './services/empresa-permissions.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Record, User]),
    ScheduleModule,
    forwardRef(() => RecordImagesModule),
    RecordMovementHistoryModule,
    AuthModule, // Proporciona EmpresaFilterGuard con UserRepository
    forwardRef(() => AuthorizationCodeModule),
  ],
  controllers: [RecordsController],
  providers: [RecordsService, EmpresaPermissionsService],
  exports: [RecordsService, EmpresaPermissionsService],
})
export class RecordsModule {}
