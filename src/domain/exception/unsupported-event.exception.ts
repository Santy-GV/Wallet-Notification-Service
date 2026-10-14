import { DomainException } from './domain.exception';

export class UnsupportedEventException extends DomainException {
  private constructor(message: string) {
    super(message);
  }

  static becauseEventIsNotHandled(eventName: string): UnsupportedEventException {
    return new UnsupportedEventException(
      `El evento "${eventName}" no tiene una notificación asociada.`,
    );
  }
}