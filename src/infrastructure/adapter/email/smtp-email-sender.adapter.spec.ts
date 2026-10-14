import type { Transporter } from 'nodemailer';
import { NotificationType } from '../../../domain/enums/notification-type.enum';
import { EmailSenderException } from '../../../domain/exception/email-sender.exception';
import { EmailDestinationModel } from '../../../domain/model/email-destination.model';
import { DestinationEmail } from '../../../domain/valueobject/destination-email';
import type { EmailConfig } from '../../config/email.config';
import { SmtpEmailSenderAdapter } from './smtp-email-sender.adapter';

const config: EmailConfig = {
  provider: 'smtp',
  fromAddress: 'no-reply@example.com',
  fromName: 'Wallet',
  timeoutMs: 1000,
  brevo: { apiKey: '', apiUrl: '' },
  smtp: { host: 'smtp.test', port: 587, username: 'user', password: 'pass' },
};

const destination = new EmailDestinationModel(
  NotificationType.USER_UPDATED,
  DestinationEmail.of('ana@example.com'),
  'Ana',
  'Asunto',
  '<p>Hola</p>',
);

describe('SmtpEmailSenderAdapter', () => {
  let sendMail: jest.Mock;
  let adapter: SmtpEmailSenderAdapter;

  beforeEach(() => {
    sendMail = jest.fn();
    adapter = new SmtpEmailSenderAdapter(config, { sendMail } as unknown as Transporter);
  });

  it('debe enviar el correo con remitente, destinatario, asunto y HTML', async () => {
    // Arrange
    sendMail.mockResolvedValue({});

    // Act
    await adapter.send(destination);

    // Assert
    expect(sendMail).toHaveBeenCalledWith({
      from: { name: 'Wallet', address: 'no-reply@example.com' },
      to: { name: 'Ana', address: 'ana@example.com' },
      subject: 'Asunto',
      html: '<p>Hola</p>',
    });
  });

  it('debe traducir cualquier fallo de nodemailer a EmailSenderException reintentable', async () => {
    // Arrange
    sendMail.mockRejectedValue(new Error('ETIMEDOUT'));

    // Act & Assert
    await expect(adapter.send(destination)).rejects.toBeInstanceOf(EmailSenderException);
    await expect(adapter.send(destination)).rejects.toMatchObject({ retriable: true });
  });
});
