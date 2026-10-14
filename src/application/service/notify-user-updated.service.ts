import { Inject, Injectable } from '@nestjs/common';
import { NotificationType } from '../../domain/enums/notification-type.enum';
import type { NotifyUserUpdatedUseCase } from '../port/in/notify-user-updated.use-case';
import { EMAIL_SENDER_PORT, type EmailSenderPort } from '../port/out/email-sender.port';
import {
  EMAIL_TEMPLATE_RENDERER_PORT,
  type EmailTemplateRendererPort,
} from '../port/out/email-template-renderer.port';
import type { NotifyUserUpdatedCommand } from './dto/command/notify-user-updated.command';
import { NotificationApplicationMapper } from './mapper/notification-application.mapper';

const TEMPLATE_NAME = 'user-updated';
const SUBJECT = 'Tu cuenta ha sido actualizada — Gestión de Usuarios';

@Injectable()
export class NotifyUserUpdatedService implements NotifyUserUpdatedUseCase {
  constructor(
    @Inject(EMAIL_SENDER_PORT) private readonly emailSender: EmailSenderPort,
    @Inject(EMAIL_TEMPLATE_RENDERER_PORT)
    private readonly templateRenderer: EmailTemplateRendererPort,
  ) {}

  async execute(command: NotifyUserUpdatedCommand): Promise<void> {
    const body = this.templateRenderer.render(TEMPLATE_NAME, {
      name: command.userName,
      email: command.userEmail,
      role: command.userRole,
      status: command.userStatus,
    });
    const destination = NotificationApplicationMapper.toEmailDestination(
      NotificationType.USER_UPDATED,
      command.userEmail,
      command.userName,
      SUBJECT,
      body,
    );
    await this.emailSender.send(destination);
  }
}