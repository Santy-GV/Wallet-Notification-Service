import type { EmailDestinationModel } from '../../../domain/model/email-destination.model';

export const EMAIL_SENDER_PORT = Symbol('EmailSenderPort');

export interface EmailSenderPort {
  /** @throws EmailSenderException si el correo no pudo entregarse al proveedor. */
  send(destination: EmailDestinationModel): Promise<void>;
}