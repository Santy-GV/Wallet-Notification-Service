import { Logger } from '@nestjs/common';
import type { EmailSenderPort } from '../../../application/port/out/email-sender.port';
import type { EmailDestinationModel } from '../../../domain/model/email-destination.model';

/**
 * Adaptador de desarrollo (`EMAIL_PROVIDER=log`): no envía nada, solo registra
 * el tipo y el asunto. Nunca registra destinatario ni cuerpo (datos personales).
 */
export class LogEmailSenderAdapter implements EmailSenderPort {
  private readonly logger = new Logger(LogEmailSenderAdapter.name);

  send(destination: EmailDestinationModel): Promise<void> {
    this.logger.log(
      `Correo simulado (no enviado). tipo=${destination.type} asunto="${destination.subject}"`,
    );
    return Promise.resolve();
  }
}
