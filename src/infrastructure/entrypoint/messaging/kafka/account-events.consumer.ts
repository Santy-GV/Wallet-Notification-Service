import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  NOTIFY_ACCOUNT_CREATED_USE_CASE,
  type NotifyAccountCreatedUseCase,
} from '../../../../application/port/in/notify-account-created.use-case';
import { AccountCreatedDomainEvent } from '../../../../domain/event/account-created.domain-event';
import type { DomainEvent } from '../../../../domain/event/domain-event';
import { UnsupportedEventException } from '../../../../domain/exception/unsupported-event.exception';
import {
  KAFKA_CLIENT,
  KAFKA_CONFIG,
  type KafkaClient,
  type KafkaConfig,
} from '../../../config/kafka.config';
import { KafkaEventConsumer } from './kafka-event.consumer';
import { EventMessageMapper } from './mapper/event-message.mapper';

const ACCOUNT_EVENT_PREFIX = 'account.';

/** Paso 7 del flujo: eventos `account.*` publicados por el microservicio Accounts. */
@Injectable()
export class AccountEventsConsumer extends KafkaEventConsumer {
  constructor(
    @Inject(KAFKA_CLIENT) kafka: KafkaClient,
    @Inject(KAFKA_CONFIG) config: KafkaConfig,
    @Inject(NOTIFY_ACCOUNT_CREATED_USE_CASE)
    private readonly notifyAccountCreated: NotifyAccountCreatedUseCase,
  ) {
    super(
      new Logger(AccountEventsConsumer.name),
      kafka,
      config,
      config.accountEventsTopic,
      `${config.groupId}-accounts`,
      ACCOUNT_EVENT_PREFIX,
    );
  }

  protected async handle(event: DomainEvent): Promise<void> {
    if (event instanceof AccountCreatedDomainEvent) {
      await this.notifyAccountCreated.execute(
        EventMessageMapper.toNotifyAccountCreatedCommand(event),
      );
      return;
    }
    throw UnsupportedEventException.becauseEventIsNotHandled(event.eventName);
  }
}