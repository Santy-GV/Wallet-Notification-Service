import { DomainException } from './domain.exception';

export class InvalidDestinationEmailException extends DomainException {
  private constructor(message: string) {
    super(message);
  }

  static becauseFormatIsInvalid(): InvalidDestinationEmailException {
    return new InvalidDestinationEmailException(
      'El correo del destinatario no tiene un formato válido.',
    );
  }
}