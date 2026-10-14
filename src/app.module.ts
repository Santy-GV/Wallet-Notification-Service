import { Module } from '@nestjs/common';
import { ConfigModule } from './infrastructure/config/config.module';
import { KafkaModule } from './infrastructure/config/kafka.module';
import { NotificationModule } from './infrastructure/config/notification.module';
import { HealthController } from './infrastructure/entrypoint/rest/health.controller';

@Module({
  imports: [ConfigModule, NotificationModule, KafkaModule],
  controllers: [HealthController],
})
export class AppModule {}
