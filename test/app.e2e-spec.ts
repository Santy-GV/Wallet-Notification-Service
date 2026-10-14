import { Logger, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { EMAIL_SENDER_PORT } from './../src/application/port/out/email-sender.port';
import type { EmailDestinationModel } from './../src/domain/model/email-destination.model';
import { UserEventsConsumer } from './../src/infrastructure/entrypoint/messaging/kafka/user-events.consumer';
import { AccountEventsConsumer } from './../src/infrastructure/entrypoint/messaging/kafka/account-events.consumer';

describe('Wallet Notification Service (e2e)', () => {
  let app: INestApplication<App>;
  const sent: EmailDestinationModel[] = [];

  beforeAll(async () => {
    process.env.EMAIL_PROVIDER = 'log';
    process.env.KAFKA_ENABLED = 'false';
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();

    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(EMAIL_SENDER_PORT)
      .useValue({
        send: (destination: EmailDestinationModel): Promise<void> => {
          sent.push(destination);
          return Promise.resolve();
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  beforeEach(() => {
    sent.length = 0;
  });

  afterAll(async () => {
    await app.close();
    jest.restoreAllMocks();
  });

  it('GET /health responde UP', () =>
    request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ status: 'UP', service: 'wallet-notification-service' }));

  it('un evento user.created del tópico termina en un correo con la plantilla real', async () => {
    // Arrange
    const message = JSON.stringify({
      eventName: 'user.created',
      occurredOn: '2026-10-12T10:00:00',
      payload: { id: 'u-1', name: 'Ana', email: 'ana@example.com', role: 'ADMIN', status: 'ACTIVE' },
    });

    // Act
    await app.get(UserEventsConsumer).consume(message, 'user-events[0]@1');

    // Assert
    expect(sent).toHaveLength(1);
    expect(sent[0].destinationEmail.value).toBe('ana@example.com');
    expect(sent[0].subject).toContain('creada');
    expect(sent[0].body).toContain('Hola, Ana');
    expect(sent[0].body).not.toContain('{{');
  });

  it('un evento account.created del tópico termina en un correo', async () => {
    // Arrange
    const message = JSON.stringify({
      eventName: 'account.created',
      occurredOn: '2026-10-12T10:00:00',
      payload: { accountId: 'a-1', userId: 'u-1', ownerName: 'Ana', ownerEmail: 'ana@example.com' },
    });

    // Act
    await app.get(AccountEventsConsumer).consume(message, 'account-events[0]@1');

    // Assert
    expect(sent).toHaveLength(1);
    expect(sent[0].body).toContain('a-1');
  });
});