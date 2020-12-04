import { BinaryBlob, blobFromUint8Array } from '@dfinity/agent';
import { Ed25519KeyIdentity, Ed25519PublicKey } from '@dfinity/authentication';
import { getItem } from 'localforage';
import { mocked } from 'ts-jest';
import { LOCAL_STORAGE_ROOT_CREDENTIAL } from '../utils/constants';
import { AuthStore, StoredKeyPair } from './authStorage';
import localforage from 'localforage';

describe('authStorage', () => {
  let mockedStorage: jest.Mock<LocalForage>;
  beforeEach(() => {
    mockedStorage = jest.fn<LocalForage, any[]>(() => {
      return {} as LocalForage;
    });
  });
  test('get response is undefiend', async () => {
    mockedStorage.mockReturnValueOnce({
      getItem(v) {
        return Promise.resolve(undefined);
      },
    } as LocalForage);
    const authStorage = new AuthStore(mockedStorage());
    const res = await authStorage.getRootIdentity();
    expect(res).toBeUndefined();
  });

  test('get response is valid', async () => {
    const id = Ed25519KeyIdentity.generate().getKeyPair();
    const fakeJSONPair = {
      publicKey: id.publicKey.toDer(),
      secretKey: id.secretKey,
    };
    mockedStorage.mockReturnValueOnce({
      getItem(v) {
        return Promise.resolve<StoredKeyPair>(fakeJSONPair);
      },
    } as LocalForage);
    const authStorage = new AuthStore(mockedStorage());
    const res = await authStorage.getRootIdentity();
    expect(res?.getKeyPair()).toEqual(id);
  });

  test('set and then get', async () => {
    const id = Ed25519KeyIdentity.generate();
    const keypair = id.getKeyPair();
    const stored: any = {};
    mockedStorage.mockReturnValueOnce({
      setItem(k, v) {
        stored.val = v;
        return Promise.resolve();
      },
      getItem(k) {
        return Promise.resolve(stored.val);
      },
    } as LocalForage);
    const authStorage = new AuthStore(mockedStorage());
    await authStorage.saveRootIdentity(id);
    const res = await authStorage.getRootIdentity();
    expect(res?.getKeyPair()).toEqual(keypair);
  });
});
