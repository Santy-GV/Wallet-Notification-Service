export class NotifyAccountCreatedCommand {
  constructor(
    readonly accountId: string,
    readonly ownerName: string,
    readonly ownerEmail: string,
  ) {}
}