export const BootstrapChangeIdentityCommandIdentifier = 'https://internetcomputer.org/ns/dfinity/bootstrap/ChangeIdentityCommand' as const;

type SignFunction = (challenge: ArrayBuffer) => Promise<ArrayBuffer>;

export type BootstrapChangeIdentityCommandDetail = {
  authenticationResponse: string;
  identity: {
    sign: SignFunction;
  };
};

export type BootstrapChangeIdentityCommand = {
  type: typeof BootstrapChangeIdentityCommandIdentifier;
  detail: BootstrapChangeIdentityCommandDetail;
};
