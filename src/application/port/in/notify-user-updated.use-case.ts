import type { NotifyUserUpdatedCommand } from '../../service/dto/command/notify-user-updated.command';

export const NOTIFY_USER_UPDATED_USE_CASE = Symbol('NotifyUserUpdatedUseCase');

export interface NotifyUserUpdatedUseCase {
  execute(command: NotifyUserUpdatedCommand): Promise<void>;
}