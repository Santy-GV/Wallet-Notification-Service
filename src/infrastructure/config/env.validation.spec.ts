import { loadEnv } from './env.validation';

describe('loadEnv', () => {
  it('debe cargar una configuración mínima de desarrollo (log + Kafka deshabilitado)', () => {
    // Act
    const env = loadEnv({ EMAIL_PROVIDER: 'log', KAFKA_ENABLED: 'false' });

    // Assert
    expect(env.app).toMatchObject({ port: 3000, serviceName: 'wallet-notification-service' });
    expect(env.email.provider).toBe('log');
    expect(env.kafka.enabled).toBe(false);
  });

  it('debe reportar TODAS las variables faltantes en un único error', () => {
    // Act
    const act = (): unknown => loadEnv({});

    // Assert
    expect(act).toThrow(/EMAIL_FROM_ADDRESS[\s\S]*BREVO_API_KEY[\s\S]*KAFKA_BROKERS/);
  });

  it('debe exigir las credenciales SMTP solo cuando el proveedor es smtp', () => {
    expect(() =>
      loadEnv({ EMAIL_PROVIDER: 'smtp', EMAIL_FROM_ADDRESS: 'a@b.com', KAFKA_ENABLED: 'false' }),
    ).toThrow(/SMTP_HOST[\s\S]*SMTP_USERNAME[\s\S]*SMTP_PASSWORD/);
  });

  it('debe cargar una configuración completa de producción (Brevo + Aiven)', () => {
    // Act
    const env = loadEnv({
      NODE_ENV: 'production',
      PORT: '10000',
      EMAIL_PROVIDER: 'brevo',
      EMAIL_FROM_ADDRESS: 'no-reply@example.com',
      BREVO_API_KEY: 'xkeysib-1',
      KAFKA_BROKERS: 'a.aivencloud.com:1234, b.aivencloud.com:1234',
      KAFKA_SSL: 'true',
      KAFKA_SSL_CA: '-----BEGIN CERTIFICATE-----\\nABC\\n-----END CERTIFICATE-----',
      KAFKA_SASL_MECHANISM: 'SCRAM-SHA-256',
      KAFKA_USERNAME: 'avnadmin',
      KAFKA_PASSWORD: 'secret',
    });

    // Assert
    expect(env.app.port).toBe(10000);
    expect(env.kafka.brokers).toEqual(['a.aivencloud.com:1234', 'b.aivencloud.com:1234']);
    expect(env.kafka.ssl?.ca).toBe('-----BEGIN CERTIFICATE-----\nABC\n-----END CERTIFICATE-----');
    expect(env.kafka.sasl).toEqual({
      mechanism: 'scram-sha-256',
      username: 'avnadmin',
      password: 'secret',
    });
  });

  it('debe envolver una CA de Kafka pegada como base64 sin cabecera PEM', () => {
    const env = loadEnv({
      EMAIL_PROVIDER: 'log',
      KAFKA_ENABLED: 'true',
      KAFKA_BROKERS: 'a.aivencloud.com:1234',
      KAFKA_SSL: 'true',
      KAFKA_SSL_CA: 'QUJDREVGR0g=',
      KAFKA_SASL_MECHANISM: 'scram-sha-256',
      KAFKA_USERNAME: 'avnadmin',
      KAFKA_PASSWORD: 'secret',
    });

    expect(env.kafka.ssl?.ca).toBe('-----BEGIN CERTIFICATE-----\nQUJDREVGR0g=\n-----END CERTIFICATE-----');
  });

  it.each([
    [{ PORT: 'abc' }, /PORT debe ser un entero positivo/],
    [{ EMAIL_PROVIDER: 'sendgrid' }, /EMAIL_PROVIDER debe ser uno de/],
    [{ KAFKA_ENABLED: 'si' }, /KAFKA_ENABLED debe ser "true" o "false"/],
    [{ KAFKA_SASL_MECHANISM: 'gssapi' }, /KAFKA_SASL_MECHANISM debe ser uno de/],
  ])('debe rechazar valores inválidos %j', (override, message) => {
    expect(() =>
      loadEnv({ EMAIL_PROVIDER: 'log', KAFKA_ENABLED: 'false', ...override }),
    ).toThrow(message);
  });

  it('no debe incluir secretos en los mensajes de error', () => {
    // Act
    const act = (): unknown =>
      loadEnv({ EMAIL_PROVIDER: 'brevo', BREVO_API_KEY: 'super-secreta', PORT: 'x' });

    // Assert
    expect(act).toThrow(expect.objectContaining({ message: expect.not.stringContaining('super-secreta') }));
  });
});
