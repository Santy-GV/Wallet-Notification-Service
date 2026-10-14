import type { NotifyAccountCreatedCommand } from '../../service/dto/command/notify-account-created.command';

export const NOTIFY_ACCOUNT_CREATED_USE_CASE = Symbol('NotifyAccountCreatedUseCase');

export interface NotifyAccountCreatedUseCase {
  execute(command: NotifyAccountCreatedCommand): Promise<void>;
}
