import { createTransport, type Transporter } from 'nodemailer';
import type { EmailSenderPort } from '../../../application/port/out/email-sender.port';
import type { EmailDestinationModel } from '../../../domain/model/email-destination.model';
import { EmailSenderException } from '../../../domain/exception/email-sender.exception';
import type { EmailConfig } from '../../config/email.config';

const SMTPS_PORT = 465;

/**
 * Envía correos por SMTP con nodemailer.
 * Nota: Render free bloquea los puertos 25/465/587; úsalo en local o en plan de pago.
 */
export class SmtpEmailSenderAdapter implements EmailSenderPort {
  private readonly transporter: Transporter;

  constructor(
    private readonly config: EmailConfig,
    transporter?: Transporter,
  ) {
    this.transporter =
      transporter ??
      createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.port === SMTPS_PORT,
        auth: { user: config.smtp.username, pass: config.smtp.password },
        connectionTimeout: config.timeoutMs,
        greetingTimeout: config.timeoutMs,
        socketTimeout: config.timeoutMs,
      });
  }

  async send(destination: EmailDestinationModel): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: { name: this.config.fromName, address: this.config.fromAddress },
        to: {
          name: destination.destinationName,
          address: destination.destinationEmail.value,
        },
        subject: destination.subject,
        html: destination.body,
      });
    } catch (error) {
      throw EmailSenderException.becauseSendFailed(error);
    }
  }
}