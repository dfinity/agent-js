export class IdentityError extends Error {
  constructor(public readonly message: string) {
    super(message);
    Object.setPrototypeOf(this, IdentityError.prototype);
  }
}

export class DelegationError extends IdentityError {
  constructor(public readonly message: string) {
    super(message);
    Object.setPrototypeOf(this, DelegationError.prototype);
  }
}
