import { InvalidDestinationEmailException } from "../exception/invalid-destination-email.exception";
import { DestinationEmail } from './destination-email';

describe('DestinationEmail', () => {
  it('debe aceptar un correo válido y recortar espacios', () => {
    // Arrange
    const raw = '  ana@example.com ';

    // Act
    const email = DestinationEmail.of(raw);

    // Assert
    expect(email.value).toBe('ana@example.com');
  });

  it.each(['', '   ', 'sin-arroba', 'a@b', 'a b@c.com', '@c.com'])(
    'debe rechazar el valor inválido "%s"',
    (raw) => {
      // Act & Assert
      expect(() => DestinationEmail.of(raw)).toThrow(expect.any(InvalidDestinationEmailException));
    },
  );

  it('debe rechazar correos de más de 254 caracteres', () => {
    // Arrange
    const raw = `${'a'.repeat(250)}@example.com`;

    // Act & Assert
    expect(() => DestinationEmail.of(raw)).toThrow(expect.any(InvalidDestinationEmailException));
  });

  it('no debe incluir el valor recibido en el mensaje de error', () => {
    // Act
    const act = (): DestinationEmail => DestinationEmail.of('secreto-sin-arroba');

    // Assert
    expect(act).toThrow(expect.objectContaining({ message: expect.not.stringContaining('secreto') }));
  });
});
