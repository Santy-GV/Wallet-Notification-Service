import type { Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { Consumer } from 'kafkajs';
import type { DomainEvent } from '../../../../domain/event/domain-event';
import { DomainException } from '../../../../domain/exception/domain.exception';
import { EmailSenderException } from '../../../../domain/exception/email-sender.exception';
import type { KafkaClient, KafkaConfig } from '../../../config/kafka.config';
import { EventMessageMapper } from './mapper/event-message.mapper';

/**
 * Base de los consumers de Kafka (adaptadores de entrada).
 * Solo traduce mensaje → evento de dominio y delega en un caso de uso.
 *
 * Política de errores:
 *  - Mensaje inválido o evento no soportado → se descarta (log) y se avanza el offset.
 *  - Fallo transitorio al enviar el correo  → se relanza para que kafkajs reintente.
 *  - Rechazo permanente del correo          → se descarta con log de error.
 */
export abstract class KafkaEventConsumer implements OnModuleInit, OnModuleDestroy {
  private consumer?: Consumer;

  protected constructor(
    protected readonly logger: Logger,
    private readonly kafka: KafkaClient,
    private readonly config: KafkaConfig,
    private readonly topic: string,
    private readonly groupId: string,
    private readonly eventNamePrefix: string,
  ) {}

  /** Caso de uso a ejecutar para un evento ya validado. */
  protected abstract handle(event: DomainEvent): Promise<void>;

  async onModuleInit(): Promise<void> {
    if (!this.config.enabled) {
      this.logger.warn('Kafka deshabilitado (KAFKA_ENABLED=false): el consumer no se inicia.');
      return;
    }
    this.consumer = this.kafka.consumer({ groupId: this.groupId });
    await this.consumer.connect();
    await this.consumer.subscribe({ topic: this.topic, fromBeginning: false });
    await this.consumer.run({
      eachMessage: ({ topic, partition, message }) =>
        this.consume(message.value?.toString('utf8'), `${topic}[${partition}]@${message.offset}`),
    });
    this.logger.log(`Consumer iniciado. topic=${this.topic} groupId=${this.groupId}`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.consumer?.disconnect();
  }

  /** Procesa un mensaje crudo. Público para poder probarlo sin un broker real. */
  async consume(rawValue: string | undefined, origin: string): Promise<void> {
    if (rawValue === undefined || rawValue.trim() === '') {
      this.logger.warn(`Mensaje vacío descartado. origen=${origin}`);
      return;
    }
    try {
      const message = EventMessageMapper.parse(rawValue);
      if (!message.eventName.startsWith(this.eventNamePrefix)) {
        return; // evento de otro dominio compartiendo tópico
      }
      const event = EventMessageMapper.toDomainEvent(message);
      await this.handle(event);
      this.logger.log(`Evento procesado. evento=${event.eventName} origen=${origin}`);
    } catch (error) {
      this.handleFailure(error, origin);
    }
  }

  private handleFailure(error: unknown, origin: string): void {
    if (error instanceof EmailSenderException) {
      if (error.retriable) {
        this.logger.warn(`Fallo transitorio, se reintentará. origen=${origin} causa=${error.message}`);
        throw error;
      }
      this.logger.error(`Correo descartado. origen=${origin} causa=${error.message}`);
      return;
    }
    if (error instanceof DomainException) {
      this.logger.warn(`Mensaje descartado. origen=${origin} causa=${error.message}`);
      return;
    }
    throw error;
  }
}
