import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { RecordsModule } from './records/records.module';
import { RecordStatusHistoryModule } from './record-status-history/record-status-history.module';
import { AuthModule } from './auth/auth.module';
import { SharedModule } from './shared/shared.module';

@Module({
  imports: [UsersModule, RecordsModule, RecordStatusHistoryModule, AuthModule, SharedModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
