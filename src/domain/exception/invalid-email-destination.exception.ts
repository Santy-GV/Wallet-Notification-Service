import { DomainException } from './domain.exception';

export class InvalidEmailDestinationException extends DomainException {
  private constructor(message: string) {
    super(message);
  }

  static becauseFieldIsBlank(fieldName: string): InvalidEmailDestinationException {
    return new InvalidEmailDestinationException(
      `El campo "${fieldName}" del correo es requerido.`,
    );
  }
}
