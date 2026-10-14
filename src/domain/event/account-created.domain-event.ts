import { DestinationEmail } from '../valueobject/destination-email';
import { DomainEvent } from './domain-event';

/**
 * Evento publicado por el microservicio Accounts (`account.created`, paso 7).
 * Contrato inicial: debe alinearse con lo que finalmente publique Accounts.
 */
export class AccountCreatedDomainEvent extends DomainEvent {
  static readonly EVENT_NAME = 'account.created';

  constructor(
    readonly accountId: string,
    readonly userId: string,
    readonly ownerName: string,
    readonly ownerEmail: DestinationEmail,
    occurredOn: Date,
  ) {
    super(AccountCreatedDomainEvent.EVENT_NAME, occurredOn);
  }

  payload(): Readonly<Record<string, string>> {
    return {
      accountId: this.accountId,
      userId: this.userId,
      ownerName: this.ownerName,
      ownerEmail: this.ownerEmail.value,
    };
  }
}