export const EMAIL_CONFIG = Symbol('EmailConfig');

export type EmailProvider = 'brevo' | 'smtp' | 'log';

export interface BrevoConfig {
  readonly apiKey: string;
  readonly apiUrl: string;
}

export interface SmtpConfig {
  readonly host: string;
  readonly port: number;
  readonly username: string;
  readonly password: string;
}

export interface EmailConfig {
  readonly provider: EmailProvider;
  readonly fromAddress: string;
  readonly fromName: string;
  readonly timeoutMs: number;
  readonly brevo: BrevoConfig;
  readonly smtp: SmtpConfig;
}