export class NotifyUserCreatedCommand {
  constructor(
    readonly userName: string,
    readonly userEmail: string,
    readonly userRole: string,
  ) {}
}