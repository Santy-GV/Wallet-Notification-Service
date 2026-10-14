/**
 * Base de todas las excepciones del dominio.
 * Los mensajes NUNCA deben incluir datos personales (correo, nombre, etc.).
 */
export abstract class DomainException extends Error {
  protected constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}