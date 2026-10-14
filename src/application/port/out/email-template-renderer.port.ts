export const EMAIL_TEMPLATE_RENDERER_PORT = Symbol('EmailTemplateRendererPort');

export interface EmailTemplateRendererPort {
  /**
   * Devuelve el HTML de la plantilla con los tokens `{{token}}` reemplazados.
   * @throws EmailSenderException si la plantilla no existe o le faltan tokens.
   */
  render(templateName: string, tokens: Readonly<Record<string, string>>): string;
}