import { Module } from '@nestjs/common';
import {
  NOTIFY_ACCOUNT_CREATED_USE_CASE,
} from '../../application/port/in/notify-account-created.use-case';
import { NOTIFY_USER_CREATED_USE_CASE } from '../../application/port/in/notify-user-created.use-case';
import { NOTIFY_USER_UPDATED_USE_CASE } from '../../application/port/in/notify-user-updated.use-case';
import { EMAIL_SENDER_PORT, type EmailSenderPort } from '../../application/port/out/email-sender.port';
import { EMAIL_TEMPLATE_RENDERER_PORT } from '../../application/port/out/email-template-renderer.port';
import { NotifyAccountCreatedService } from '../../application/service/notify-account-created.service';
import { NotifyUserCreatedService } from '../../application/service/notify-user-created.service';
import { NotifyUserUpdatedService } from '../../application/service/notify-user-updated.service';
import { BrevoEmailSenderAdapter } from '../adapter/email/brevo-email-sender.adapter';
import { LogEmailSenderAdapter } from '../adapter/email/log-email-sender.adapter';
import { SmtpEmailSenderAdapter } from '../adapter/email/smtp-email-sender.adapter';
import { FileEmailTemplateRendererAdapter } from '../adapter/template/file-email-template-renderer.adapter';
import { EMAIL_CONFIG, type EmailConfig } from './email.config';

/** Selecciona el adaptador de salida según `EMAIL_PROVIDER`. */
export function createEmailSender(config: EmailConfig): EmailSenderPort {
  switch (config.provider) {
    case 'brevo':
      return new BrevoEmailSenderAdapter(config);
    case 'smtp':
      return new SmtpEmailSenderAdapter(config);
    case 'log':
      return new LogEmailSenderAdapter();
  }
}

/**
 * Composition root de la aplicación: aquí (y solo aquí) se enlazan los puertos
 * con sus adaptadores y los casos de uso con sus servicios.
 */
@Module({
  providers: [
    { provide: EMAIL_TEMPLATE_RENDERER_PORT, useFactory: () => new FileEmailTemplateRendererAdapter() },
    { provide: EMAIL_SENDER_PORT, inject: [EMAIL_CONFIG], useFactory: createEmailSender },
    { provide: NOTIFY_USER_CREATED_USE_CASE, useClass: NotifyUserCreatedService },
    { provide: NOTIFY_USER_UPDATED_USE_CASE, useClass: NotifyUserUpdatedService },
    { provide: NOTIFY_ACCOUNT_CREATED_USE_CASE, useClass: NotifyAccountCreatedService },
  ],
  exports: [
    NOTIFY_USER_CREATED_USE_CASE,
    NOTIFY_USER_UPDATED_USE_CASE,
    NOTIFY_ACCOUNT_CREATED_USE_CASE,
  ],
})
export class NotificationModule {}