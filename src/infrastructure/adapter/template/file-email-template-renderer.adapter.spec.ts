import { EmailSenderException } from '../../../domain/exception/email-sender.exception';
import { FileEmailTemplateRendererAdapter } from './file-email-template-renderer.adapter';

describe('FileEmailTemplateRendererAdapter', () => {
  const renderer = new FileEmailTemplateRendererAdapter();

  it.each([
    ['user-created', { name: 'Ana', email: 'ana@example.com', role: 'ADMIN' }],
    ['user-updated', { name: 'Ana', email: 'ana@example.com', role: 'ADMIN', status: 'ACTIVE' }],
    ['account-created', { name: 'Ana', email: 'ana@example.com', accountId: 'acc-1' }],
  ])('debe renderizar la plantilla real "%s" sin dejar tokens sin reemplazar', (template, tokens) => {
    // Act
    const html = renderer.render(template, tokens);

    // Assert
    expect(html).not.toContain('{{');
    expect(html).toContain('Ana');
  });

  it('debe escapar HTML en los valores para evitar inyección', () => {
    // Act
    const html = renderer.render('user-created', {
      name: '<script>alert(1)</script>',
      email: 'ana@example.com',
      role: 'ADMIN',
    });

    // Assert
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('debe fallar sin posibilidad de reintento si falta un token', () => {
    // Act
    const act = (): string => renderer.render('user-created', { name: 'Ana' });

    // Assert
    expect(act).toThrow(expect.objectContaining({ retriable: false }));
    expect(act).toThrow(expect.any(EmailSenderException));
  });

  it('debe fallar si la plantilla no existe', () => {
    expect(() => renderer.render('no-existe', {})).toThrow(expect.any(EmailSenderException));
  });

  it('debe rechazar nombres de plantilla con rutas relativas (path traversal)', () => {
    expect(() => renderer.render('../../../package', {})).toThrow(expect.any(EmailSenderException));
  });
});
