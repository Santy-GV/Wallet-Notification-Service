import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { EmailTemplateRendererPort } from '../../../application/port/out/email-template-renderer.port';
import { EmailSenderException } from '../../../domain/exception/email-sender.exception';

const TEMPLATE_NAME_PATTERN = /^[a-z0-9-]+$/;
const TOKEN_PATTERN = /\{\{(\w+)\}\}/g;
const HTML_ESCAPES: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/** Lee plantillas `.html` del disco y reemplaza `{{token}}` escapando el HTML. */
export class FileEmailTemplateRendererAdapter implements EmailTemplateRendererPort {
  private readonly cache = new Map<string, string>();

  constructor(private readonly templatesDir: string = join(__dirname, 'templates')) {}

  render(templateName: string, tokens: Readonly<Record<string, string>>): string {
    const template = this.load(templateName);
    return template.replace(TOKEN_PATTERN, (_placeholder, key: string) => {
      if (!Object.hasOwn(tokens, key)) {
        throw EmailSenderException.becauseTemplateCouldNotBeRendered(
          templateName,
          new Error(`Falta el token "${key}".`),
        );
      }
      return escapeHtml(tokens[key]);
    });
  }

  private load(templateName: string): string {
    const cached = this.cache.get(templateName);
    if (cached !== undefined) {
      return cached;
    }
    if (!TEMPLATE_NAME_PATTERN.test(templateName)) {
      throw EmailSenderException.becauseTemplateCouldNotBeRendered(templateName);
    }
    try {
      const content = readFileSync(join(this.templatesDir, `${templateName}.html`), 'utf8');
      this.cache.set(templateName, content);
      return content;
    } catch (error) {
      throw EmailSenderException.becauseTemplateCouldNotBeRendered(templateName, error);
    }
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => HTML_ESCAPES[character]);
}