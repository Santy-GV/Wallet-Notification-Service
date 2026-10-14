import type { AppConfig } from './app.config';
import type { EmailConfig, EmailProvider } from './email.config';
import type {
  KafkaConfig,
  KafkaSaslConfig,
  KafkaSaslMechanism,
  KafkaSslConfig,
} from './kafka.config';

export const ENV = Symbol('Env');

export interface Env {
  readonly app: AppConfig;
  readonly email: EmailConfig;
  readonly kafka: KafkaConfig;
}

type EnvSource = Readonly<Record<string, string | undefined>>;

const EMAIL_PROVIDERS: readonly EmailProvider[] = ['brevo', 'smtp', 'log'];
const SASL_MECHANISMS: readonly KafkaSaslMechanism[] = [
  'plain',
  'scram-sha-256',
  'scram-sha-512',
];
const SERVICE_NAME = 'wallet-notification-service';
const DEFAULT_PORT = 3000;
const DEFAULT_SMTP_PORT = 587;
const DEFAULT_EMAIL_TIMEOUT_MS = 10_000;
const DEFAULT_BREVO_URL = 'https://api.brevo.com/v3/smtp/email';

class EnvReader {
  readonly errors: string[] = [];

  constructor(private readonly source: EnvSource) {}

  text(key: string, fallback = ''): string {
    const value = this.source[key]?.trim();
    return value ? value : fallback;
  }

  requiredWhen(condition: boolean, key: string): string {
    const value = this.text(key);
    if (condition && value === '') {
      this.errors.push(`${key} es requerida.`);
    }
    return value;
  }

  integer(key: string, fallback: number): number {
    const raw = this.text(key);
    if (raw === '') {
      return fallback;
    }
    const parsed = Number(raw);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      this.errors.push(`${key} debe ser un entero positivo.`);
      return fallback;
    }
    return parsed;
  }

  boolean(key: string, fallback: boolean): boolean {
    const raw = this.text(key).toLowerCase();
    if (raw === '') {
      return fallback;
    }
    if (raw !== 'true' && raw !== 'false') {
      this.errors.push(`${key} debe ser "true" o "false".`);
      return fallback;
    }
    return raw === 'true';
  }

  oneOf<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
    const raw = this.text(key);
    if (raw === '') {
      return fallback;
    }
    const match = allowed.find((option) => option === raw.toLowerCase());
    if (match === undefined) {
      this.errors.push(`${key} debe ser uno de: ${allowed.join(', ')}.`);
      return fallback;
    }
    return match;
  }

  list(key: string): string[] {
    return this.text(key)
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item !== '');
  }

  /** Las variables multilínea (PEM) suelen llegar con `\n` literales. */
  pem(key: string): string | undefined {
    const value = this.text(key);
    return value === '' ? undefined : value.replace(/\\n/g, '\n');
  }

  certificate(key: string): string | undefined {
    const value = this.pem(key);
    if (!value || value.includes('-----BEGIN CERTIFICATE-----')) {
      return value;
    }
    const base64 = value.replace(/\s/g, '');
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
      return value;
    }
    const lines = base64.match(/.{1,64}/g)?.join('\n');
    return lines ? `-----BEGIN CERTIFICATE-----\n${lines}\n-----END CERTIFICATE-----` : value;
  }
}

/**
 * Lee y valida las variables de entorno. Si falta o es inválida alguna,
 * lanza un único error con TODOS los problemas para fallar rápido al arrancar.
 */
export function loadEnv(source: EnvSource = process.env): Env {
  const reader = new EnvReader(source);

  const app = readAppConfig(reader);
  const email = readEmailConfig(reader);
  const kafka = readKafkaConfig(reader);

  if (reader.errors.length > 0) {
    const details = reader.errors.map((error) => ` - ${error}`).join('\n');
    throw new Error(`Configuración de entorno inválida:\n${details}`);
  }
  return { app, email, kafka };
}

function readAppConfig(reader: EnvReader): AppConfig {
  return {
    nodeEnv: reader.text('NODE_ENV', 'development'),
    port: reader.integer('PORT', DEFAULT_PORT),
    serviceName: SERVICE_NAME,
  };
}

function readEmailConfig(reader: EnvReader): EmailConfig {
  const provider = reader.oneOf('EMAIL_PROVIDER', EMAIL_PROVIDERS, 'brevo');
  const sendsRealEmail = provider !== 'log';
  return {
    provider,
    fromAddress: reader.requiredWhen(sendsRealEmail, 'EMAIL_FROM_ADDRESS'),
    fromName: reader.text('EMAIL_FROM_NAME', 'Wallet Notification Service'),
    timeoutMs: reader.integer('EMAIL_TIMEOUT_MS', DEFAULT_EMAIL_TIMEOUT_MS),
    brevo: {
      apiKey: reader.requiredWhen(provider === 'brevo', 'BREVO_API_KEY'),
      apiUrl: reader.text('BREVO_API_URL', DEFAULT_BREVO_URL),
    },
    smtp: {
      host: reader.requiredWhen(provider === 'smtp', 'SMTP_HOST'),
      port: reader.integer('SMTP_PORT', DEFAULT_SMTP_PORT),
      username: reader.requiredWhen(provider === 'smtp', 'SMTP_USERNAME'),
      password: reader.requiredWhen(provider === 'smtp', 'SMTP_PASSWORD'),
    },
  };
}

function readKafkaConfig(reader: EnvReader): KafkaConfig {
  const enabled = reader.boolean('KAFKA_ENABLED', true);
  const brokers = reader.list('KAFKA_BROKERS');
  if (enabled && brokers.length === 0) {
    reader.errors.push('KAFKA_BROKERS es requerida (lista separada por comas).');
  }
  return {
    enabled,
    brokers,
    clientId: reader.text('KAFKA_CLIENT_ID', SERVICE_NAME),
    groupId: reader.text('KAFKA_GROUP_ID', 'wallet-notifier'),
    userEventsTopic: reader.text('KAFKA_TOPIC_USER_EVENTS', 'user-events'),
    accountEventsTopic: reader.text('KAFKA_TOPIC_ACCOUNT_EVENTS', 'account-events'),
    ssl: readKafkaSsl(reader),
    sasl: readKafkaSasl(reader, enabled),
  };
}

function readKafkaSsl(reader: EnvReader): KafkaSslConfig | undefined {
  if (!reader.boolean('KAFKA_SSL', false)) {
    return undefined;
  }
  return {
    ca: reader.certificate('KAFKA_SSL_CA'),
    cert: reader.pem('KAFKA_SSL_CERT'),
    key: reader.pem('KAFKA_SSL_KEY'),
  };
}

function readKafkaSasl(reader: EnvReader, enabled: boolean): KafkaSaslConfig | undefined {
  const rawMechanism = reader.text('KAFKA_SASL_MECHANISM');
  if (rawMechanism === '') {
    return undefined;
  }
  const mechanism = reader.oneOf('KAFKA_SASL_MECHANISM', SASL_MECHANISMS, 'plain');
  return {
    mechanism,
    username: reader.requiredWhen(enabled, 'KAFKA_USERNAME'),
    password: reader.requiredWhen(enabled, 'KAFKA_PASSWORD'),
  };
}