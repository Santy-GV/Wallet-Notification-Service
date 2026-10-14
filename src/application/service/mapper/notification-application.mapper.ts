import type { NotificationType } from '../../../domain/enums/notification-type.enum';
import { EmailDestinationModel } from '../../../domain/model/email-destination.model';
import { DestinationEmail } from '../../../domain/valueobject/destination-email';

export class NotificationApplicationMapper {
  private constructor() {}

  static toEmailDestination(
    type: NotificationType,
    recipientEmail: string,
    recipientName: string,
    subject: string,
    body: string,
  ): EmailDestinationModel {
    return new EmailDestinationModel(
      type,
      DestinationEmail.of(recipientEmail),
      recipientName,
      subject,
      body,
    );
  }
}