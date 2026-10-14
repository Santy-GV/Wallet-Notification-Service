export class NotifyUserUpdatedCommand {
  constructor(
    readonly userName: string,
    readonly userEmail: string,
    readonly userRole: string,
    readonly userStatus: string,
  ) {}
}