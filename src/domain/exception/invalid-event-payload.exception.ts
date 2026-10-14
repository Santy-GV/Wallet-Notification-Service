import { DomainException } from './domain.exception';

export class InvalidEventPayloadException extends DomainException {
  private constructor(message: string) {
    super(message);
  }

  static becauseMessageIsMalformed(): InvalidEventPayloadException {
    return new InvalidEventPayloadException(
      'El mensaje recibido no es un evento válido (JSON o estructura incorrecta).',
    );
  }

  static becauseFieldIsMissing(
    eventName: string,
    fieldName: string,
  ): InvalidEventPayloadException {
    return new InvalidEventPayloadException(
      `El evento "${eventName}" no incluye el campo requerido "${fieldName}".`,
    );
  }
}
