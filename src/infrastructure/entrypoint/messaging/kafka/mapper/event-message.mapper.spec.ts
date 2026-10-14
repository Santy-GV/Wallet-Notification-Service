import { AccountCreatedDomainEvent } from '../../../../../domain/event/account-created.domain-event';
import { UserCreatedDomainEvent } from '../../../../../domain/event/user-created.domain-event';
import { UserUpdatedDomainEvent } from '../../../../../domain/event/user-updated.domain-event';
import { InvalidDestinationEmailException } from '../../../../../domain/exception/invalid-destination-email.exception';
import { InvalidEventPayloadException } from '../../../../../domain/exception/invalid-event-payload.exception';
import { UnsupportedEventException } from '../../../../../domain/exception/unsupported-event.exception';
import { EventMessageMapper } from './event-message.mapper';

const userPayload = {
  id: 'u-1',
  name: 'Ana',
  email: 'ana@example.com',
  role: 'ADMIN',
  status: 'ACTIVE',
};

describe('EventMessageMapper', () => {
  describe('parse', () => {
    it('debe parsear un sobre válido', () => {
      // Arrange
      const raw = JSON.stringify({
        eventName: 'user.created',
        occurredOn: '2026-10-12T10:00:00',
        payload: userPayload,
      });

      // Act
      const message = EventMessageMapper.parse(raw);

      // Assert
      expect(message.eventName).toBe('user.created');
      expect(message.payload).toEqual(userPayload);
    });

    it.each([
      ['JSON inválido', '{no-es-json'],
      ['un array', '[]'],
      ['sin eventName', JSON.stringify({ payload: {} })],
      ['eventName vacío', JSON.stringify({ eventName: ' ', payload: {} })],
      ['sin payload', JSON.stringify({ eventName: 'user.created' })],
      ['payload que no es objeto', JSON.stringify({ eventName: 'user.created', payload: 'x' })],
    ])('debe rechazar %s', (_case, raw) => {
      expect(() => EventMessageMapper.parse(raw)).toThrow(expect.any(InvalidEventPayloadException));
    });
  });

  describe('toDomainEvent', () => {
    it('debe construir UserCreatedDomainEvent', () => {
      // Act
      const event = EventMessageMapper.toDomainEvent({
        eventName: 'user.created',
        occurredOn: '2026-10-12T10:00:00.000Z',
        payload: userPayload,
      });

      // Assert
      expect(event).toBeInstanceOf(UserCreatedDomainEvent);
      expect(event.payload()).toEqual(userPayload);
      expect(event.occurredOn.toISOString()).toBe('2026-10-12T10:00:00.000Z');
    });

    it('debe construir UserUpdatedDomainEvent', () => {
      const event = EventMessageMapper.toDomainEvent({
        eventName: 'user.updated',
        occurredOn: undefined,
        payload: userPayload,
      });

      expect(event).toBeInstanceOf(UserUpdatedDomainEvent);
    });

    it('debe construir AccountCreatedDomainEvent', () => {
      // Act
      const event = EventMessageMapper.toDomainEvent({
        eventName: 'account.created',
        occurredOn: undefined,
        payload: { accountId: 'a-1', userId: 'u-1', ownerName: 'Ana', ownerEmail: 'ana@example.com' },
      });

      // Assert
      expect(event).toBeInstanceOf(AccountCreatedDomainEvent);
    });

    it('debe usar la fecha actual si occurredOn tiene un formato irreconocible', () => {
      // Arrange
      const before = Date.now();

      // Act
      const event = EventMessageMapper.toDomainEvent({
        eventName: 'user.created',
        occurredOn: [2026, 10, 12, 10, 0],
        payload: userPayload,
      });

      // Assert
      expect(event.occurredOn.getTime()).toBeGreaterThanOrEqual(before);
    });

    it('debe aceptar valores numéricos en el payload', () => {
      const event = EventMessageMapper.toDomainEvent({
        eventName: 'user.created',
        occurredOn: undefined,
        payload: { ...userPayload, id: 42 },
      });

      expect(event.payload().id).toBe('42');
    });

    it('debe rechazar un evento al que le falta un campo requerido', () => {
      // Arrange
      const { role: _omitted, ...incomplete } = userPayload;

      // Act & Assert
      expect(() =>
        EventMessageMapper.toDomainEvent({
          eventName: 'user.created',
          occurredOn: undefined,
          payload: incomplete,
        }),
      ).toThrow(expect.any(InvalidEventPayloadException));
    });

    it('debe rechazar un correo con formato inválido', () => {
      expect(() =>
        EventMessageMapper.toDomainEvent({
          eventName: 'user.created',
          occurredOn: undefined,
          payload: { ...userPayload, email: 'no-es-correo' },
        }),
      ).toThrow(expect.any(InvalidDestinationEmailException));
    });

    it('debe rechazar eventos sin notificación asociada (user.deleted)', () => {
      expect(() =>
        EventMessageMapper.toDomainEvent({
          eventName: 'user.deleted',
          occurredOn: undefined,
          payload: userPayload,
        }),
      ).toThrow(expect.any(UnsupportedEventException));
    });
  });

  describe('comandos', () => {
    it('debe mapear UserCreatedDomainEvent a NotifyUserCreatedCommand', () => {
      const event = EventMessageMapper.toDomainEvent({
        eventName: 'user.created',
        occurredOn: undefined,
        payload: userPayload,
      }) as UserCreatedDomainEvent;

      expect(EventMessageMapper.toNotifyUserCreatedCommand(event)).toEqual({
        userName: 'Ana',
        userEmail: 'ana@example.com',
        userRole: 'ADMIN',
      });
    });

    it('debe mapear UserUpdatedDomainEvent a NotifyUserUpdatedCommand', () => {
      const event = EventMessageMapper.toDomainEvent({
        eventName: 'user.updated',
        occurredOn: undefined,
        payload: userPayload,
      }) as UserUpdatedDomainEvent;

      expect(EventMessageMapper.toNotifyUserUpdatedCommand(event)).toEqual({
        userName: 'Ana',
        userEmail: 'ana@example.com',
        userRole: 'ADMIN',
        userStatus: 'ACTIVE',
      });
    });

    it('debe mapear AccountCreatedDomainEvent a NotifyAccountCreatedCommand', () => {
      const event = EventMessageMapper.toDomainEvent({
        eventName: 'account.created',
        occurredOn: undefined,
        payload: { accountId: 'a-1', userId: 'u-1', ownerName: 'Ana', ownerEmail: 'ana@example.com' },
      }) as AccountCreatedDomainEvent;

      expect(EventMessageMapper.toNotifyAccountCreatedCommand(event)).toEqual({
        accountId: 'a-1',
        ownerName: 'Ana',
        ownerEmail: 'ana@example.com',
      });
    });
  });
});
