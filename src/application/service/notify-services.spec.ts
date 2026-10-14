import { NotificationType } from '../../domain/enums/notification-type.enum';
import { InvalidDestinationEmailException } from '../../domain/exception/invalid-destination-email.exception';
import type { EmailDestinationModel } from '../../domain/model/email-destination.model';
import type { EmailSenderPort } from '../port/out/email-sender.port';
import type { EmailTemplateRendererPort } from '../port/out/email-template-renderer.port';
import { NotifyAccountCreatedCommand } from './dto/command/notify-account-created.command';
import { NotifyUserCreatedCommand } from './dto/command/notify-user-created.command';
import { NotifyUserUpdatedCommand } from './dto/command/notify-user-updated.command';
import { NotifyAccountCreatedService } from './notify-account-created.service';
import { NotifyUserCreatedService } from './notify-user-created.service';
import { NotifyUserUpdatedService } from './notify-user-updated.service';

interface Scenario {
  readonly name: string;
  readonly type: NotificationType;
  readonly template: string;
  readonly tokens: Record<string, string>;
  readonly run: (sender: EmailSenderPort, renderer: EmailTemplateRendererPort) => Promise<void>;
  readonly runWithInvalidEmail: (
    sender: EmailSenderPort,
    renderer: EmailTemplateRendererPort,
  ) => Promise<void>;
}

const scenarios: Scenario[] = [
  {
    name: 'NotifyUserCreatedService',
    type: NotificationType.USER_CREATED,
    template: 'user-created',
    tokens: { name: 'Ana', email: 'ana@example.com', role: 'ADMIN' },
    run: (sender, renderer) =>
      new NotifyUserCreatedService(sender, renderer).execute(
        new NotifyUserCreatedCommand('Ana', 'ana@example.com', 'ADMIN'),
      ),
    runWithInvalidEmail: (sender, renderer) =>
      new NotifyUserCreatedService(sender, renderer).execute(
        new NotifyUserCreatedCommand('Ana', 'no-es-correo', 'ADMIN'),
      ),
  },
  {
    name: 'NotifyUserUpdatedService',
    type: NotificationType.USER_UPDATED,
    template: 'user-updated',
    tokens: { name: 'Ana', email: 'ana@example.com', role: 'ADMIN', status: 'ACTIVE' },
    run: (sender, renderer) =>
      new NotifyUserUpdatedService(sender, renderer).execute(
        new NotifyUserUpdatedCommand('Ana', 'ana@example.com', 'ADMIN', 'ACTIVE'),
      ),
    runWithInvalidEmail: (sender, renderer) =>
      new NotifyUserUpdatedService(sender, renderer).execute(
        new NotifyUserUpdatedCommand('Ana', 'no-es-correo', 'ADMIN', 'ACTIVE'),
      ),
  },
  {
    name: 'NotifyAccountCreatedService',
    type: NotificationType.ACCOUNT_CREATED,
    template: 'account-created',
    tokens: { name: 'Ana', email: 'ana@example.com', accountId: 'acc-1' },
    run: (sender, renderer) =>
      new NotifyAccountCreatedService(sender, renderer).execute(
        new NotifyAccountCreatedCommand('acc-1', 'Ana', 'ana@example.com'),
      ),
    runWithInvalidEmail: (sender, renderer) =>
      new NotifyAccountCreatedService(sender, renderer).execute(
        new NotifyAccountCreatedCommand('acc-1', 'Ana', 'no-es-correo'),
      ),
  },
];

describe.each(scenarios)('$name', (scenario) => {
  let send: jest.Mock<Promise<void>, [EmailDestinationModel]>;
  let render: jest.Mock<string, [string, Readonly<Record<string, string>>]>;
  let sender: EmailSenderPort;
  let renderer: EmailTemplateRendererPort;

  beforeEach(() => {
    send = jest.fn().mockResolvedValue(undefined);
    render = jest.fn().mockReturnValue('<p>cuerpo</p>');
    sender = { send };
    renderer = { render };
  });

  it('debe renderizar la plantilla correcta y enviar el correo', async () => {
    // Act
    await scenario.run(sender, renderer);

    // Assert
    expect(render).toHaveBeenCalledWith(scenario.template, scenario.tokens);
    expect(send).toHaveBeenCalledTimes(1);
    const destination = send.mock.calls[0][0];
    expect(destination).toMatchObject({
      type: scenario.type,
      destinationName: 'Ana',
      body: '<p>cuerpo</p>',
    });
    expect(destination.destinationEmail.value).toBe('ana@example.com');
    expect(destination.subject.length).toBeGreaterThan(0);
  });

  it('no debe enviar nada si el correo del destinatario es inválido', async () => {
    // Act
    const act = scenario.runWithInvalidEmail(sender, renderer);

    // Assert
    await expect(act).rejects.toThrow(expect.any( InvalidDestinationEmailException ));
    expect(send).not.toHaveBeenCalled();
  });

  it('debe propagar el error del puerto de envío', async () => {
    // Arrange
    send.mockRejectedValue(new Error('fallo'));

    // Act & Assert
    await expect(scenario.run(sender, renderer)).rejects.toThrow('fallo');
  });
});
