import { SignIdentity, AnonymousIdentity } from '@dfinity/agent';

export type IIdentityDescriptor =
  | { type: 'AnonymousIdentity' }
  | { type: 'PublicKeyIdentity'; publicKey: string };

export function IdentityDescriptor(
  identity: SignIdentity | AnonymousIdentity,
): IIdentityDescriptor {
  const identityIndicator: IIdentityDescriptor =
    'getPublicKey' in identity
      ? { type: 'PublicKeyIdentity', publicKey: identity.getPublicKey().toDer().toString('hex') }
      : { type: 'AnonymousIdentity' };
  return identityIndicator;
}

export function isIdentityDescriptor(
  value: unknown | IIdentityDescriptor,
): value is IIdentityDescriptor {
  switch ((value as IIdentityDescriptor)?.type) {
    case 'AnonymousIdentity':
      return true;
    case 'PublicKeyIdentity':
      if (typeof (value as any)?.publicKey !== 'string') return false;
      return true;
  }
  return false;
}
