import { NotificationType } from '../../../domain/enums/notification-type.enum';
import { EmailSenderException } from '../../../domain/exception/email-sender.exception';
import { EmailDestinationModel } from '../../../domain/model/email-destination.model';
import { DestinationEmail } from '../../../domain/valueobject/destination-email';
import type { EmailConfig } from '../../config/email.config';
import { BrevoEmailSenderAdapter } from './brevo-email-sender.adapter';

const config: EmailConfig = {
  provider: 'brevo',
  fromAddress: 'no-reply@example.com',
  fromName: 'Wallet',
  timeoutMs: 1000,
  brevo: { apiKey: 'key-123', apiUrl: 'https://api.brevo.test/v3/smtp/email' },
  smtp: { host: '', port: 587, username: '', password: '' },
};

const destination = new EmailDestinationModel(
  NotificationType.USER_CREATED,
  DestinationEmail.of('ana@example.com'),
  'Ana',
  'Asunto',
  '<p>Hola</p>',
);

describe('BrevoEmailSenderAdapter', () => {
  let fetchMock: jest.Mock<Promise<Response>, [string | URL | Request, RequestInit?]>;
  let adapter: BrevoEmailSenderAdapter;

  beforeEach(() => {
    fetchMock = jest.fn();
    adapter = new BrevoEmailSenderAdapter(config, fetchMock as unknown as typeof fetch);
  });

  it('debe enviar la petición esperada a la API de Brevo', async () => {
    // Arrange
    fetchMock.mockResolvedValue(new Response('{}', { status: 201 }));

    // Act
    await adapter.send(destination);

    // Assert
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(config.brevo.apiUrl);
    expect(init?.method).toBe('POST');
    expect(init?.headers).toMatchObject({ 'api-key': 'key-123' });
    expect(JSON.parse(init?.body as string)).toEqual({
      sender: { name: 'Wallet', email: 'no-reply@example.com' },
      to: [{ email: 'ana@example.com', name: 'Ana' }],
      subject: 'Asunto',
      htmlContent: '<p>Hola</p>',
      tags: ['USER_CREATED'],
    });
  });

  it.each([500, 503, 429, 401])('debe marcar como reintentable el HTTP %i', async (status) => {
    // Arrange
    fetchMock.mockResolvedValue(new Response('{}', { status }));

    // Act & Assert
    await expect(adapter.send(destination)).rejects.toMatchObject({ retriable: true });
  });

  it.each([400, 404])('debe marcar como NO reintentable el HTTP %i', async (status) => {
    // Arrange
    fetchMock.mockResolvedValue(new Response('{}', { status }));

    // Act & Assert
    await expect(adapter.send(destination)).rejects.toBeInstanceOf(EmailSenderException);
    await expect(adapter.send(destination)).rejects.toMatchObject({ retriable: false });
  });

  it('debe marcar como reintentable un error de red o timeout', async () => {
    // Arrange
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));

    // Act & Assert
    await expect(adapter.send(destination)).rejects.toMatchObject({ retriable: true });
  });

  it('no debe incluir datos personales en el mensaje de error', async () => {
    // Arrange
    fetchMock.mockResolvedValue(new Response('{}', { status: 400 }));

    // Act & Assert
    await expect(adapter.send(destination)).rejects.toThrow(
      expect.objectContaining({ message: expect.not.stringMatching(/ana@example\.com|Ana/) }),
    );
  });
});