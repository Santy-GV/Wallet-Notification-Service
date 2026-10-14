import { Logger } from '@nestjs/common';
import type { NotifyAccountCreatedUseCase } from '../../../../application/port/in/notify-account-created.use-case';
import type { NotifyUserCreatedUseCase } from '../../../../application/port/in/notify-user-created.use-case';
import type { NotifyUserUpdatedUseCase } from '../../../../application/port/in/notify-user-updated.use-case';
import { EmailSenderException } from '../../../../domain/exception/email-sender.exception';
import type { KafkaClient, KafkaConfig } from '../../../config/kafka.config';
import { AccountEventsConsumer } from './account-events.consumer';
import { UserEventsConsumer } from './user-events.consumer';

const kafkaConfig: KafkaConfig = {
  enabled: true,
  brokers: ['broker:9092'],
  clientId: 'test',
  groupId: 'group',
  userEventsTopic: 'user-events',
  accountEventsTopic: 'account-events',
};

const userEvent = (eventName: string, overrides: Record<string, unknown> = {}): string =>
  JSON.stringify({
    eventName,
    occurredOn: '2026-10-12T10:00:00',
    payload: {
      id: 'u-1',
      name: 'Ana',
      email: 'ana@example.com',
      role: 'ADMIN',
      status: 'ACTIVE',
      ...overrides,
    },
  });

const accountEvent = JSON.stringify({
  eventName: 'account.created',
  occurredOn: '2026-10-12T10:00:00',
  payload: { accountId: 'a-1', userId: 'u-1', ownerName: 'Ana', ownerEmail: 'ana@example.com' },
});

const kafka = {} as KafkaClient;

describe('UserEventsConsumer', () => {
  let created: jest.Mock<Promise<void>, Parameters<NotifyUserCreatedUseCase['execute']>>;
  let updated: jest.Mock<Promise<void>, Parameters<NotifyUserUpdatedUseCase['execute']>>;
  let consumer: UserEventsConsumer;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    created = jest.fn().mockResolvedValue(undefined);
    updated = jest.fn().mockResolvedValue(undefined);
    consumer = new UserEventsConsumer(
      kafka,
      kafkaConfig,
      { execute: created },
      { execute: updated },
    );
  });

  afterEach(() => jest.restoreAllMocks());

  it('debe ejecutar NotifyUserCreated al recibir user.created', async () => {
    // Act
    await consumer.consume(userEvent('user.created'), 'user-events[0]@1');

    // Assert
    expect(created).toHaveBeenCalledWith({
      userName: 'Ana',
      userEmail: 'ana@example.com',
      userRole: 'ADMIN',
    });
    expect(updated).not.toHaveBeenCalled();
  });

  it('debe ejecutar NotifyUserUpdated al recibir user.updated', async () => {
    // Act
    await consumer.consume(userEvent('user.updated'), 'user-events[0]@2');

    // Assert
    expect(updated).toHaveBeenCalledWith({
      userName: 'Ana',
      userEmail: 'ana@example.com',
      userRole: 'ADMIN',
      userStatus: 'ACTIVE',
    });
    expect(created).not.toHaveBeenCalled();
  });

  it('debe ignorar eventos de otro dominio que compartan tópico', async () => {
    await expect(consumer.consume(accountEvent, 'o')).resolves.toBeUndefined();
    expect(created).not.toHaveBeenCalled();
    expect(updated).not.toHaveBeenCalled();
  });

  it.each([
    ['evento sin notificación (user.deleted)', userEvent('user.deleted')],
    ['JSON inválido', '{roto'],
    ['correo inválido', userEvent('user.created', { email: 'no-es-correo' })],
    ['campo faltante', userEvent('user.created', { role: '' })],
    ['mensaje vacío', ''],
    ['mensaje sin valor', undefined],
  ])('debe descartar sin lanzar error: %s', async (_case, raw) => {
    await expect(consumer.consume(raw, 'o')).resolves.toBeUndefined();
    expect(created).not.toHaveBeenCalled();
    expect(updated).not.toHaveBeenCalled();
  });

  it('debe relanzar un fallo transitorio de envío para que Kafka reintente', async () => {
    // Arrange
    created.mockRejectedValue(EmailSenderException.becauseSendFailed());

    // Act & Assert
    await expect(consumer.consume(userEvent('user.created'), 'o')).rejects.toBeInstanceOf(
      EmailSenderException,
    );
  });

  it('debe descartar un rechazo permanente del correo sin relanzar', async () => {
    // Arrange
    created.mockRejectedValue(EmailSenderException.becauseProviderRejected(400));

    // Act & Assert
    await expect(consumer.consume(userEvent('user.created'), 'o')).resolves.toBeUndefined();
  });

  it('debe relanzar errores inesperados', async () => {
    // Arrange
    created.mockRejectedValue(new Error('bug'));

    // Act & Assert
    await expect(consumer.consume(userEvent('user.created'), 'o')).rejects.toThrow('bug');
  });

  it('no debe registrar datos personales en los logs', async () => {
    // Arrange
    const warn = jest.spyOn(Logger.prototype, 'warn');

    // Act
    await consumer.consume(userEvent('user.created', { email: 'no-es-correo' }), 'o');

    // Assert
    const logged = JSON.stringify(warn.mock.calls);
    expect(logged).not.toContain('Ana');
    expect(logged).not.toContain('no-es-correo');
  });

  it('no debe conectarse a Kafka si está deshabilitado', async () => {
    // Arrange
    const consumerFactory = jest.fn();
    const disabled = new UserEventsConsumer(
      { consumer: consumerFactory } as unknown as KafkaClient,
      { ...kafkaConfig, enabled: false },
      { execute: created },
      { execute: updated },
    );

    // Act
    await disabled.onModuleInit();

    // Assert
    expect(consumerFactory).not.toHaveBeenCalled();
  });
});

describe('AccountEventsConsumer', () => {
  let execute: jest.Mock<Promise<void>, Parameters<NotifyAccountCreatedUseCase['execute']>>;
  let consumer: AccountEventsConsumer;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    execute = jest.fn().mockResolvedValue(undefined);
    consumer = new AccountEventsConsumer(kafka, kafkaConfig, { execute });
  });

  afterEach(() => jest.restoreAllMocks());

  it('debe ejecutar NotifyAccountCreated al recibir account.created', async () => {
    // Act
    await consumer.consume(accountEvent, 'account-events[0]@1');

    // Assert
    expect(execute).toHaveBeenCalledWith({
      accountId: 'a-1',
      ownerName: 'Ana',
      ownerEmail: 'ana@example.com',
    });
  });

  it('debe ignorar eventos user.* que compartan tópico', async () => {
    await consumer.consume(userEvent('user.created'), 'o');

    expect(execute).not.toHaveBeenCalled();
  });
});
