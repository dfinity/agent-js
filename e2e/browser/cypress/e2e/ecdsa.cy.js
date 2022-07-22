import { ECDSAKeyIdentity } from '@dfinity/identity';
import { get, set } from 'idb-keyval';
import { createActor } from '../utils/actor';
import ids from '../../.dfx/local/canister_ids.json';
const canisterId = ids.whoami.local;

const setup = async () => {
  const identity1 = await ECDSAKeyIdentity.generate();
  const whoami1 = createActor(ids.whoami.local, { agentOptions: { identity: identity1 } });

  const principal1 = await whoami1.whoami();

  return { principal1, whoami1, identity1 };
};

describe('ECDSAKeyIdentity tests with SubtleCrypto', () => {
  it('generates a new identity', () => {
    cy.visit('http://localhost:1234');
    cy.window().then(async window => {
      const { principal1 } = await setup();
      const str = principal1.toString();
      expect(str).to.be.an('string');
    });
  });
  it('can persist an identity in indexeddb', () => {
    cy.visit('http://localhost:1234');
    cy.window().then(async window => {
      const { principal1, identity1 } = await setup();
      const str = principal1.toString();
      expect(str).to.be.an('string');

      await set('keyPair', identity1.getKeyPair());
      const storedKeyPair = await get('keyPair');

      const identity2 = await ECDSAKeyIdentity.fromKeyPair(storedKeyPair);

      const whoami2 = createActor(canisterId, { agentOptions: { identity: identity2 } });

      const principal2 = await whoami2.whoami();

      expect(principal2.toString()).to.equal(str);
    });
  });
});
