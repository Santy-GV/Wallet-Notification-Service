/**
 * Sobre JSON que viaja por el tópico. Replica `DomainEvent` de Users:
 * `{ "eventName": "user.created", "occurredOn": "...", "payload": { ... } }`
 */
export interface DomainEventMessage {
  readonly eventName: string;
  readonly occurredOn: unknown;
  readonly payload: Readonly<Record<string, unknown>>;
}