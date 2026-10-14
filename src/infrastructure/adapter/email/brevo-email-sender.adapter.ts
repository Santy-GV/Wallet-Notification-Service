import type { EmailSenderPort } from '../../../application/port/out/email-sender.port';
import type { EmailDestinationModel } from '../../../domain/model/email-destination.model';
import { EmailSenderException } from '../../../domain/exception/email-sender.exception';
import type { EmailConfig } from '../../config/email.config';

/**
 * Envía correos por la API HTTP de Brevo (https://api.brevo.com/v3/smtp/email).
 * Es el adaptador recomendado en Render free, que bloquea los puertos SMTP.
 */
export class BrevoEmailSenderAdapter implements EmailSenderPort {
  constructor(
    private readonly config: EmailConfig,
    private readonly httpFetch: typeof fetch = fetch,
  ) {}

  async send(destination: EmailDestinationModel): Promise<void> {
    let response: Response;
    try {
      response = await this.httpFetch(this.config.brevo.apiUrl, {
        method: 'POST',
        headers: {
          'api-key': this.config.brevo.apiKey,
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({
          sender: { name: this.config.fromName, email: this.config.fromAddress },
          to: [
            {
              email: destination.destinationEmail.value,
              name: destination.destinationName,
            },
          ],
          subject: destination.subject,
          htmlContent: destination.body,
          tags: [destination.type],
        }),
        signal: AbortSignal.timeout(this.config.timeoutMs),
      });
    } catch (error) {
      throw EmailSenderException.becauseSendFailed(error);
    }

    if (!response.ok) {
      throw EmailSenderException.becauseProviderRejected(response.status);
    }
  }
}