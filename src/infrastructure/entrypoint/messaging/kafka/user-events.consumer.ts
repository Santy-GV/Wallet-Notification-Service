import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  NOTIFY_USER_CREATED_USE_CASE,
  type NotifyUserCreatedUseCase,
} from '../../../../application/port/in/notify-user-created.use-case';
import {
  NOTIFY_USER_UPDATED_USE_CASE,
  type NotifyUserUpdatedUseCase,
} from '../../../../application/port/in/notify-user-updated.use-case';
import type { DomainEvent } from '../../../../domain/event/domain-event';
import { UserCreatedDomainEvent } from '../../../../domain/event/user-created.domain-event';
import { UserUpdatedDomainEvent } from '../../../../domain/event/user-updated.domain-event';
import { UnsupportedEventException } from '../../../../domain/exception/unsupported-event.exception';
import {
  KAFKA_CLIENT,
  KAFKA_CONFIG,
  type KafkaClient,
  type KafkaConfig,
} from '../../../config/kafka.config';
import { KafkaEventConsumer } from './kafka-event.consumer';
import { EventMessageMapper } from './mapper/event-message.mapper';

const USER_EVENT_PREFIX = 'user.';

/** Paso 3 del flujo: eventos `user.*` publicados por el microservicio Users. */
@Injectable()
export class UserEventsConsumer extends KafkaEventConsumer {
  constructor(
    @Inject(KAFKA_CLIENT) kafka: KafkaClient,
    @Inject(KAFKA_CONFIG) config: KafkaConfig,
    @Inject(NOTIFY_USER_CREATED_USE_CASE)
    private readonly notifyUserCreated: NotifyUserCreatedUseCase,
    @Inject(NOTIFY_USER_UPDATED_USE_CASE)
    private readonly notifyUserUpdated: NotifyUserUpdatedUseCase,
  ) {
    super(
      new Logger(UserEventsConsumer.name),
      kafka,
      config,
      config.userEventsTopic,
      `${config.groupId}-users`,
      USER_EVENT_PREFIX,
    );
  }

  protected async handle(event: DomainEvent): Promise<void> {
    if (event instanceof UserCreatedDomainEvent) {
      await this.notifyUserCreated.execute(EventMessageMapper.toNotifyUserCreatedCommand(event));
      return;
    }
    if (event instanceof UserUpdatedDomainEvent) {
      await this.notifyUserUpdated.execute(EventMessageMapper.toNotifyUserUpdatedCommand(event));
      return;
    }
    throw UnsupportedEventException.becauseEventIsNotHandled(event.eventName);
  }
}