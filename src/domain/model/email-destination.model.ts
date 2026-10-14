import { NotificationType } from '../enums/notification-type.enum';
import { InvalidEmailDestinationException } from '../exception/invalid-email-destination.exception';
import { DestinationEmail } from '../valueobject/destination-email';

export class EmailDestinationModel {
  readonly type: NotificationType;
  readonly destinationEmail: DestinationEmail;
  readonly destinationName: string;
  readonly subject: string;
  readonly body: string;

  constructor(
    type: NotificationType,
    destinationEmail: DestinationEmail,
    destinationName: string,
    subject: string,
    body: string,
  ) {
    this.type = type;
    this.destinationEmail = destinationEmail;
    this.destinationName = EmailDestinationModel.requireNotBlank(
      destinationName,
      'destinationName',
    );
    this.subject = EmailDestinationModel.requireNotBlank(subject, 'subject');
    this.body = EmailDestinationModel.requireNotBlank(body, 'body');
  }

  private static requireNotBlank(value: string, fieldName: string): string {
    if (value.trim().length === 0) {
      throw InvalidEmailDestinationException.becauseFieldIsBlank(fieldName);
    }
    return value;
  }
}