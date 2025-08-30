import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationCode } from './entities/authorization-code.entity';
import { Record as RecordEntity } from '../records/entities/record.entity';
import { User } from '../users/entities/user.entity';
import { AuthorizationCodeService } from './authorization-code.service';
import { AuthorizationCodeController } from './authorization-code.controller';
import { RecordMovementHistoryModule } from '../record-movement-history/record-movement-history.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AuthorizationCode, RecordEntity, User]),
    RecordMovementHistoryModule,
    AuthModule,
  ],
  controllers: [AuthorizationCodeController],
  providers: [AuthorizationCodeService],
  exports: [AuthorizationCodeService],
})
export class AuthorizationCodeModule {}
