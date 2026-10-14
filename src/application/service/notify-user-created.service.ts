import { Inject, Injectable } from '@nestjs/common';
import { NotificationType } from '../../domain/enums/notification-type.enum';
import type { NotifyUserCreatedUseCase } from '../port/in/notify-user-created.use-case';
import { EMAIL_SENDER_PORT, type EmailSenderPort } from '../port/out/email-sender.port';
import {
  EMAIL_TEMPLATE_RENDERER_PORT,
  type EmailTemplateRendererPort,
} from '../port/out/email-template-renderer.port';
import type { NotifyUserCreatedCommand } from './dto/command/notify-user-created.command';
import { NotificationApplicationMapper } from './mapper/notification-application.mapper';

const TEMPLATE_NAME = 'user-created';
const SUBJECT = 'Tu cuenta ha sido creada — Gestión de Usuarios';

@Injectable()
export class NotifyUserCreatedService implements NotifyUserCreatedUseCase {
  constructor(
    @Inject(EMAIL_SENDER_PORT) private readonly emailSender: EmailSenderPort,
    @Inject(EMAIL_TEMPLATE_RENDERER_PORT)
    private readonly templateRenderer: EmailTemplateRendererPort,
  ) {}

  async execute(command: NotifyUserCreatedCommand): Promise<void> {
    const body = this.templateRenderer.render(TEMPLATE_NAME, {
      name: command.userName,
      email: command.userEmail,
      role: command.userRole,
    });
    const destination = NotificationApplicationMapper.toEmailDestination(
      NotificationType.USER_CREATED,
      command.userEmail,
      command.userName,
      SUBJECT,
      body,
    );
    await this.emailSender.send(destination);
  }
}