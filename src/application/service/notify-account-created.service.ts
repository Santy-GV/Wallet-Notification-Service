import { Inject, Injectable } from '@nestjs/common';
import { NotificationType } from '../../domain/enums/notification-type.enum';
import type { NotifyAccountCreatedUseCase } from '../port/in/notify-account-created.use-case';
import { EMAIL_SENDER_PORT, type EmailSenderPort } from '../port/out/email-sender.port';
import {
  EMAIL_TEMPLATE_RENDERER_PORT,
  type EmailTemplateRendererPort,
} from '../port/out/email-template-renderer.port';
import type { NotifyAccountCreatedCommand } from './dto/command/notify-account-created.command';
import { NotificationApplicationMapper } from './mapper/notification-application.mapper';

const TEMPLATE_NAME = 'account-created';
const SUBJECT = 'Tu cuenta ha sido creada exitosamente';

@Injectable()
export class NotifyAccountCreatedService implements NotifyAccountCreatedUseCase {
  constructor(
    @Inject(EMAIL_SENDER_PORT) private readonly emailSender: EmailSenderPort,
    @Inject(EMAIL_TEMPLATE_RENDERER_PORT)
    private readonly templateRenderer: EmailTemplateRendererPort,
  ) {}

  async execute(command: NotifyAccountCreatedCommand): Promise<void> {
    const body = this.templateRenderer.render(TEMPLATE_NAME, {
      name: command.ownerName,
      email: command.ownerEmail,
      accountId: command.accountId,
    });
    const destination = NotificationApplicationMapper.toEmailDestination(
      NotificationType.ACCOUNT_CREATED,
      command.ownerEmail,
      command.ownerName,
      SUBJECT,
      body,
    );
    await this.emailSender.send(destination);
  }
}