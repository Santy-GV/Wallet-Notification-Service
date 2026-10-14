export abstract class DomainEvent {
  protected constructor(
    readonly eventName: string,
    readonly occurredOn: Date,
  ) {}

  /** Representación plana del evento, idéntica al `payload` del mensaje en el tópico. */
  abstract payload(): Readonly<Record<string, string>>;
}