import { DestinationEmail } from '../valueobject/destination-email';
import { DomainEvent } from './domain-event';

/** Evento publicado por el microservicio Users (`user.created`). */
export class UserCreatedDomainEvent extends DomainEvent {
  static readonly EVENT_NAME = 'user.created';

  constructor(
    readonly userId: string,
    readonly name: string,
    readonly email: DestinationEmail,
    readonly role: string,
    readonly status: string,
    occurredOn: Date,
  ) {
    super(UserCreatedDomainEvent.EVENT_NAME, occurredOn);
  }

  payload(): Readonly<Record<string, string>> {
    return {
      id: this.userId,
      name: this.name,
      email: this.email.value,
      role: this.role,
      status: this.status,
    };
  }
}