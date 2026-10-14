import { NotifyAccountCreatedCommand } from '../../../../../application/service/dto/command/notify-account-created.command';
import { NotifyUserCreatedCommand } from '../../../../../application/service/dto/command/notify-user-created.command';
import { NotifyUserUpdatedCommand } from '../../../../../application/service/dto/command/notify-user-updated.command';
import { AccountCreatedDomainEvent } from '../../../../../domain/event/account-created.domain-event';
import type { DomainEvent } from '../../../../../domain/event/domain-event';
import { UserCreatedDomainEvent } from '../../../../../domain/event/user-created.domain-event';
import { UserUpdatedDomainEvent } from '../../../../../domain/event/user-updated.domain-event';
import { InvalidEventPayloadException } from '../../../../../domain/exception/invalid-event-payload.exception';
import { UnsupportedEventException } from '../../../../../domain/exception/unsupported-event.exception';
import { DestinationEmail } from '../../../../../domain/valueobject/destination-email';
import type { DomainEventMessage } from '../dto/domain-event.message';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export class EventMessageMapper {
  private constructor() {}

  /** Convierte el texto crudo del tópico en un sobre validado. */
  static parse(rawValue: string): DomainEventMessage {
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawValue);
    } catch {
      throw InvalidEventPayloadException.becauseMessageIsMalformed();
    }
    if (
      !isRecord(parsed) ||
      typeof parsed.eventName !== 'string' ||
      parsed.eventName.trim() === '' ||
      !isRecord(parsed.payload)
    ) {
      throw InvalidEventPayloadException.becauseMessageIsMalformed();
    }
    return {
      eventName: parsed.eventName,
      occurredOn: parsed.occurredOn,
      payload: parsed.payload,
    };
  }

  /** Traduce el sobre al evento de dominio tipado (capa anticorrupción). */
  static toDomainEvent(message: DomainEventMessage): DomainEvent {
    const occurredOn = EventMessageMapper.resolveOccurredOn(message.occurredOn);
    const field = (name: string): string =>
      EventMessageMapper.requireField(message, name);

    switch (message.eventName) {
      case UserCreatedDomainEvent.EVENT_NAME:
        return new UserCreatedDomainEvent(
          field('id'),
          field('name'),
          DestinationEmail.of(field('email')),
          field('role'),
          field('status'),
          occurredOn,
        );
      case UserUpdatedDomainEvent.EVENT_NAME:
        return new UserUpdatedDomainEvent(
          field('id'),
          field('name'),
          DestinationEmail.of(field('email')),
          field('role'),
          field('status'),
          occurredOn,
        );
      case AccountCreatedDomainEvent.EVENT_NAME:
        return new AccountCreatedDomainEvent(
          field('accountId'),
          field('userId'),
          field('ownerName'),
          DestinationEmail.of(field('ownerEmail')),
          occurredOn,
        );
      default:
        throw UnsupportedEventException.becauseEventIsNotHandled(message.eventName);
    }
  }

  static toNotifyUserCreatedCommand(event: UserCreatedDomainEvent): NotifyUserCreatedCommand {
    return new NotifyUserCreatedCommand(event.name, event.email.value, event.role);
  }

  static toNotifyUserUpdatedCommand(event: UserUpdatedDomainEvent): NotifyUserUpdatedCommand {
    return new NotifyUserUpdatedCommand(event.name, event.email.value, event.role, event.status);
  }

  static toNotifyAccountCreatedCommand(
    event: AccountCreatedDomainEvent,
  ): NotifyAccountCreatedCommand {
    return new NotifyAccountCreatedCommand(event.accountId, event.ownerName, event.ownerEmail.value);
  }

  private static requireField(message: DomainEventMessage, fieldName: string): string {
    const value = message.payload[fieldName];
    const text =
      typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
    if (text === '') {
      throw InvalidEventPayloadException.becauseFieldIsMissing(message.eventName, fieldName);
    }
    return text;
  }

  /** La fecha no es crítica: si el formato no es reconocible se usa el momento actual. */
  private static resolveOccurredOn(value: unknown): Date {
    if (typeof value === 'string' || typeof value === 'number') {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    return new Date();
  }
}