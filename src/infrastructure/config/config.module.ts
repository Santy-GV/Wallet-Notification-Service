import { Global, Module } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from './app.config';
import { EMAIL_CONFIG, type EmailConfig } from './email.config';
import { ENV, loadEnv, type Env } from './env.validation';
import { KAFKA_CONFIG, type KafkaConfig } from './kafka.config';

/** Expone la configuración validada como providers inyectables en toda la app. */
@Global()
@Module({
  providers: [
    { provide: ENV, useFactory: (): Env => loadEnv() },
    { provide: APP_CONFIG, inject: [ENV], useFactory: (env: Env): AppConfig => env.app },
    { provide: EMAIL_CONFIG, inject: [ENV], useFactory: (env: Env): EmailConfig => env.email },
    { provide: KAFKA_CONFIG, inject: [ENV], useFactory: (env: Env): KafkaConfig => env.kafka },
  ],
  exports: [APP_CONFIG, EMAIL_CONFIG, KAFKA_CONFIG],
})
export class ConfigModule {}
