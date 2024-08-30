import {
  Actor,
  ActorMethod,
  Certificate,
  HttpAgent,
  LookupResultFound,
  LookupStatus,
  getManagementCanister,
} from '@dfinity/agent';
import { IDL } from '@dfinity/candid';
import { Principal } from '@dfinity/principal';
import agent from '../utils/agent';
import { test, describe, it, expect, vi } from 'vitest';

test('read_state', async () => {
  const resolvedAgent = await agent;
  const now = Date.now() / 1000;
  const path = [new TextEncoder().encode('time')];
  const canisterId = Principal.fromHex('00000000000000000001');
  const response = await resolvedAgent.readState(canisterId, {
    paths: [path],
  });
  if (resolvedAgent.rootKey == null) throw new Error(`The agent doesn't have a root key yet`);
  const cert = await Certificate.create({
    certificate: response.certificate,
    rootKey: resolvedAgent.rootKey,
    canisterId: canisterId,
  });
  expect(cert.lookup([new TextEncoder().encode('Time')])).toEqual({ status: LookupStatus.Unknown });

  let rawTime = cert.lookup(path);

  expect(rawTime.status).toEqual(LookupStatus.Found);
  rawTime = rawTime as LookupResultFound;

  expect(rawTime.value).toBeInstanceOf(ArrayBuffer);
  rawTime.value = rawTime.value as ArrayBuffer;

  const decoded = IDL.decode(
    [IDL.Nat],
    new Uint8Array([
      ...new TextEncoder().encode('DIDL\x00\x01\x7d'),
      ...(new Uint8Array(rawTime.value) || []),
    ]),
  )[0];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const time = Number(decoded as any) / 1e9;
  // The diff between decoded time and local time is within 5s
  expect(Math.abs(time - now) < 5).toBe(true);
});

test('read_state with passed request', async () => {
  const resolvedAgent = await agent;
  const now = Date.now() / 1000;
  const path = [new TextEncoder().encode('time')];
  const canisterId = Principal.fromHex('00000000000000000001');
  const request = await resolvedAgent.createReadStateRequest({ paths: [path] });
  const response = await resolvedAgent.readState(
    canisterId,
    {
      paths: [path],
    },
    undefined,
    request,
  );
  if (resolvedAgent.rootKey == null) throw new Error(`The agent doesn't have a root key yet`);
  const cert = await Certificate.create({
    certificate: response.certificate,
    rootKey: resolvedAgent.rootKey,
    canisterId: canisterId,
  });
  expect(cert.lookup([new TextEncoder().encode('Time')])).toEqual({ status: LookupStatus.Unknown });

  let rawTime = cert.lookup(path);

  expect(rawTime.status).toEqual(LookupStatus.Found);
  rawTime = rawTime as LookupResultFound;

  expect(rawTime.value).toBeInstanceOf(ArrayBuffer);
  rawTime.value = rawTime.value as ArrayBuffer;

  const decoded = IDL.decode(
    [IDL.Nat],
    new Uint8Array([
      ...new TextEncoder().encode('DIDL\x00\x01\x7d'),
      ...(new Uint8Array(rawTime.value) || []),
    ]),
  )[0];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const time = Number(decoded as any) / 1e9;
  // The diff between decoded time and local time is within 5s
  expect(Math.abs(time - now) < 5).toBe(true);
});

test('createCanister', async () => {
  // Make sure this doesn't fail.
  await getManagementCanister({
    agent: await agent,
  }).provisional_create_canister_with_cycles({
    amount: [BigInt(1e12)],
    settings: [],
    specified_id: [],
    sender_canister_version: [],
  });
});

test('withOptions', async () => {
  // Make sure this fails.
  await expect(
    (async () => {
      const canisterActor = await getManagementCanister({
        agent: await agent,
      });
      await (canisterActor.provisional_create_canister_with_cycles as ActorMethod).withOptions({
        canisterId: 'abcde-gghhi',
      })({ amount: [BigInt(1e12)], settings: [] });
    })(),
  ).rejects.toThrow();

  // Make sure this doesn't fail.
  await getManagementCanister({
    agent: await agent,
  }).provisional_create_canister_with_cycles({
    amount: [BigInt(1e12)],
    settings: [],
    specified_id: [],
    sender_canister_version: [],
  });
});

describe('certificate options', () => {
  it('should allow you to customize certificate options', async () => {
    const idlFactory = ({ IDL }) => {
      return IDL.Service({
        greet: IDL.Func([IDL.Text], [IDL.Text], []),
      });
    };
    vi.useRealTimers();
    const actor = Actor.createActor(idlFactory, {
      canisterId: Principal.fromText('tnnnb-2yaaa-aaaab-qaiiq-cai'),
      agent: HttpAgent.createSync({
        retryTimes: 0,
        // Deliberately using a non-standard port to ensure the request fails
      }),
      createCertificateOptions: {
        maxAgeInMinutes: 2,
      },
    });

    const foo = await actor.greet('test'); //?
    expect(foo).toMatchInlineSnapshot('"Hello, test!"');
  });
});
