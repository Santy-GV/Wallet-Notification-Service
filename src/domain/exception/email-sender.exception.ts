import { DomainException } from './domain.exception';

/**
 * Error al preparar o entregar un correo.
 * `retriable` indica si reintentar el mismo mensaje tiene sentido
 * (fallo transitorio) o no (rechazo permanente / plantilla inválida).
 */
export class EmailSenderException extends DomainException {
  private constructor(
    message: string,
    readonly retriable: boolean,
    options?: ErrorOptions,
  ) {
    super(message, options);
  }

  /** Fallo transitorio (red, timeout, 5xx, 429): se puede reintentar. */
  static becauseSendFailed(cause?: unknown): EmailSenderException {
    return new EmailSenderException(
      'No fue posible enviar el correo electrónico.',
      true,
      { cause },
    );
  }

  /**
   * El proveedor respondió con error. Son reintentables los fallos transitorios
   * (408, 429, 5xx) y los de credenciales (401/403): se corrigen con configuración,
   * y descartar el mensaje perdería la notificación. El resto (400, 404...) son
   * rechazos permanentes del correo en sí.
   */
  static becauseProviderRejected(statusCode: number): EmailSenderException {
    const retriable =
      statusCode === 401 ||
      statusCode === 403 ||
      statusCode === 408 ||
      statusCode === 429 ||
      statusCode >= 500;
    return new EmailSenderException(
      `El proveedor de correo rechazó el envío (HTTP ${statusCode}).`,
      retriable,
    );
  }

  /** La plantilla no existe o está mal formada: reintentar no lo arregla. */
  static becauseTemplateCouldNotBeRendered(
    templateName: string,
    cause?: unknown,
  ): EmailSenderException {
    return new EmailSenderException(
      `No fue posible renderizar la plantilla "${templateName}".`,
      false,
      { cause },
    );
  }
}