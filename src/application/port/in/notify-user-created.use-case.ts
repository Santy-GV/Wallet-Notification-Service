import type { NotifyUserCreatedCommand } from '../../service/dto/command/notify-user-created.command';

export const NOTIFY_USER_CREATED_USE_CASE = Symbol('NotifyUserCreatedUseCase');

export interface NotifyUserCreatedUseCase {
  execute(command: NotifyUserCreatedCommand): Promise<void>;
}