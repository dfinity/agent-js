import {
  ActorMethod,
  Certificate,
  LookupResultFound,
  LookupStatus,
  bufFromBufLike,
  getManagementCanister,
} from '@dfinity/agent';
import { IDL } from '@dfinity/candid';
import { Principal } from '@dfinity/principal';
import agent from '../utils/agent';
import { test, expect } from 'vitest';
import { strToUtf8 } from '@dfinity/agent/src';

/**
 * Util for determining the default effective canister id, necessary for pocketic
 * @returns the default effective canister id
 */
export async function getDefaultEffectiveCanisterId() {
  const res = await fetch('http://localhost:4943/_/topology'); //?
  const data = await res.json(); //?
  const id = data['default_effective_canister_id']['canister_id'];
  // decode from base64
  const decoded = Buffer.from(id, 'base64').toString('hex');

  return Principal.fromHex(decoded);
}

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
test('read_state', async () => {
  const ecid = await getDefaultEffectiveCanisterId();
  const resolvedAgent = await agent;
  const now = Date.now() / 1000;
  const path = [new TextEncoder().encode('time')];
  const response = await resolvedAgent.readState(ecid, {
    paths: [path],
  });
  if (resolvedAgent.rootKey == null) throw new Error(`The agent doesn't have a root key yet`);
  const cert = await Certificate.create({
    certificate: response.certificate,
    rootKey: resolvedAgent.rootKey,
    canisterId: ecid,
  });
  expect(cert.lookup([new TextEncoder().encode('Time')])).toEqual({
    status: LookupStatus.Unknown,
  });

  let rawTime = cert.lookup(path);

  expect(rawTime.status).toEqual(LookupStatus.Found);
  rawTime = rawTime as LookupResultFound;

  expect(rawTime.value).toBeInstanceOf(ArrayBuffer);
  rawTime.value = rawTime.value as ArrayBuffer;

  const decoded = IDL.decode(
    [IDL.Nat],
    bufFromBufLike([
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
  const canisterId = await getDefaultEffectiveCanisterId();
  const request = await resolvedAgent.createReadStateRequest({ paths: [path] });
  const response = await resolvedAgent.readStateSigned(canisterId, request);
  if (resolvedAgent.rootKey == null) throw new Error(`The agent doesn't have a root key yet`);
  const cert = await Certificate.create({
    certificate: response.certificate,
    rootKey: resolvedAgent.rootKey,
    canisterId: canisterId,
  });
  expect(cert.lookup([new TextEncoder().encode('Time')])).toEqual({
    status: LookupStatus.Unknown,
  });

  let rawTime = cert.lookup(path);

  expect(rawTime.status).toEqual(LookupStatus.Found);
  rawTime = rawTime as LookupResultFound;

  expect(rawTime.value).toBeInstanceOf(ArrayBuffer);
  rawTime.value = rawTime.value as ArrayBuffer;

  const decoded = IDL.decode(
    [IDL.Nat],
    bufFromBufLike([
      ...new TextEncoder().encode('DIDL\x00\x01\x7d'),
      ...(new Uint8Array(rawTime.value) || []),
    ]),
  )[0];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const time = Number(decoded as any) / 1e9;
  // The diff between decoded time and local time is within 5s
  expect(Math.abs(time - now) < 5).toBe(true);
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
