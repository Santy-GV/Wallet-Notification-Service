import { InvalidDestinationEmailException } from "../exception/invalid-destination-email.exception";
const MAX_EMAIL_LENGTH = 254;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class DestinationEmail {
  private constructor(readonly value: string) {}

  static of(rawValue: string): DestinationEmail {
    const normalized = rawValue.trim();
    if (normalized.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(normalized)) {
      throw InvalidDestinationEmailException.becauseFormatIsInvalid();
    }
    return new DestinationEmail(normalized);
  }
}