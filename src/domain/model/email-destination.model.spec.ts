import { NotificationType } from '../enums/notification-type.enum';
import { InvalidEmailDestinationException } from '../exception/invalid-email-destination.exception';
import { DestinationEmail } from '../valueobject/destination-email';
import { EmailDestinationModel } from './email-destination.model';

describe('EmailDestinationModel', () => {
  const email = DestinationEmail.of('ana@example.com');

  it('debe construirse con datos válidos', () => {
    // Act
    const model = new EmailDestinationModel(
      NotificationType.USER_CREATED,
      email,
      'Ana',
      'Asunto',
      '<p>Hola</p>',
    );

    // Assert
    expect(model).toMatchObject({
      type: NotificationType.USER_CREATED,
      destinationName: 'Ana',
      subject: 'Asunto',
      body: '<p>Hola</p>',
    });
    expect(model.destinationEmail.value).toBe('ana@example.com');
  });

  it.each([
    ['destinationName', ['', 'Asunto', 'cuerpo']],
    ['subject', ['Ana', '  ', 'cuerpo']],
    ['body', ['Ana', 'Asunto', '']],
  ])('debe rechazar "%s" en blanco', (_field, [name, subject, body]) => {
    // Act & Assert
    expect(
      () => new EmailDestinationModel(NotificationType.USER_CREATED, email, name, subject, body),
    ).toThrow(expect.any(InvalidEmailDestinationException));
  });
});
