import { beforeEach, describe, it, vi, expect } from 'vitest';
import {
  MockReplica,
  prepareV2QueryResponse,
  prepareV2ReadStateSubnetResponse,
  prepareV2ReadStateTimeResponse,
} from '../utils/mock-replica';
import { IDL } from '@icp-sdk/core/candid';
import { Principal } from '@icp-sdk/core/principal';
import { KeyPair, randomIdentity, randomKeyPair } from '../utils/identity';
import {
  CertificateOutdatedErrorCode,
  HttpAgent,
  requestIdOf,
  TrustError,
} from '@icp-sdk/core/agent';
import { createActor } from '../canisters/counter';

const MINUTE_TO_MSECS = 60 * 1_000;

const ICP_LEDGER = 'ryjl3-tyaaa-aaaaa-aaaba-cai';

describe('queryExpiry', () => {
  const now = new Date('2025-05-01T12:34:56.789Z');
  const canisterId = Principal.fromText('uxrrr-q7777-77774-qaaaq-cai');

  const greetMethodName = 'queryGreet';
  const greetReq = 'world';
  const greetRes = 'Hello, world!';
  const greetArgs = IDL.encode([IDL.Text], [greetReq]);
  const greetReply = IDL.encode([IDL.Text], [greetRes]);

  const subnetKeyPair = randomKeyPair();
  const nodeIdentity = randomIdentity();
  const identity = randomIdentity();

  let mockReplica: MockReplica;

  beforeEach(async () => {
    mockReplica = await MockReplica.create();

    vi.setSystemTime(now);
  });

  it('should not retry if the timestamp is within the max ingress expiry', async () => {
    const agent = await HttpAgent.create({
      host: mockReplica.address,
      rootKey: subnetKeyPair.publicKeyDer,
      identity,
    });
    const actor = await createActor(canisterId, { agent });
    const sender = identity.getPrincipal();

    const { responseBody, requestId } = await prepareV2QueryResponse({
      canisterId,
      methodName: greetMethodName,
      arg: greetArgs,
      sender,
      reply: greetReply,
      nodeIdentity,
      date: now,
    });
    mockReplica.setV2QuerySpyImplOnce(canisterId.toString(), (_req, res) => {
      res.status(200).send(responseBody);
    });

    const { responseBody: subnetResponseBody } = await prepareV2ReadStateSubnetResponse({
      nodeIdentity,
      canisterRanges: [[canisterId.toUint8Array(), canisterId.toUint8Array()]],
      keyPair: subnetKeyPair,
    });
    mockReplica.setV2ReadStateSpyImplOnce(canisterId.toString(), (_req, res) => {
      res.status(200).send(subnetResponseBody);
    });

    const actorResponse = await actor[greetMethodName](greetReq);

    expect(actorResponse).toEqual(greetRes);
    expect(mockReplica.getV2QuerySpy(canisterId.toString())).toHaveBeenCalledTimes(1);
    expect(mockReplica.getV2ReadStateSpy(canisterId.toString())).toHaveBeenCalledTimes(1);

    const req = mockReplica.getV2QueryReq(canisterId.toString(), 0);
    expect(requestIdOf(req.content)).toEqual(requestId);
  });

  it('should fail if the timestamp is outside the max ingress expiry (no retry)', async () => {
    const agent = await HttpAgent.create({
      host: mockReplica.address,
      rootKey: subnetKeyPair.publicKeyDer,
      identity,
      retryTimes: 0,
    });
    const actor = await createActor(canisterId, { agent });
    const sender = identity.getPrincipal();

    const { responseBody } = await prepareV2QueryResponse({
      canisterId,
      methodName: greetMethodName,
      arg: greetArgs,
      sender,
      reply: greetReply,
      nodeIdentity,
      date: now,
    });
    mockReplica.setV2QuerySpyImplOnce(canisterId.toString(), (_req, res) => {
      res.status(200).send(responseBody);
    });

    // advance to go over the max ingress expiry (5 minutes)
    advanceTimeByMilliseconds(6 * MINUTE_TO_MSECS);

    const { responseBody: subnetResponseBody } = await prepareV2ReadStateSubnetResponse({
      nodeIdentity,
      canisterRanges: [[canisterId.toUint8Array(), canisterId.toUint8Array()]],
      keyPair: subnetKeyPair,
      date: now,
    });
    mockReplica.setV2ReadStateSpyImplOnce(canisterId.toString(), (_req, res) => {
      res.status(200).send(subnetResponseBody);
    });

    expect.assertions(5);

    try {
      await actor[greetMethodName](greetReq);
    } catch (e) {
      expectCertificateOutdatedError(e);
    }

    expect(mockReplica.getV2QuerySpy(canisterId.toString())).toHaveBeenCalledTimes(1);
    expect(mockReplica.getV2ReadStateSpy(canisterId.toString())).toHaveBeenCalledTimes(0);
  });

  it('should retry and fail if the timestamp is outside the max ingress expiry (with retry)', async () => {
    const agent = await HttpAgent.create({
      host: mockReplica.address,
      rootKey: subnetKeyPair.publicKeyDer,
      identity,
      retryTimes: 3,
    });
    const actor = await createActor(canisterId, { agent });
    const sender = identity.getPrincipal();

    const { responseBody } = await prepareV2QueryResponse({
      canisterId,
      methodName: greetMethodName,
      arg: greetArgs,
      sender,
      reply: greetReply,
      nodeIdentity,
      date: now,
    });
    mockReplica.setV2QuerySpyImplOnce(canisterId.toString(), (_req, res) => {
      res.status(200).send(responseBody);
    });
    mockReplica.setV2QuerySpyImplOnce(canisterId.toString(), (_req, res) => {
      res.status(200).send(responseBody);
    });
    mockReplica.setV2QuerySpyImplOnce(canisterId.toString(), (_req, res) => {
      res.status(200).send(responseBody);
    });
    mockReplica.setV2QuerySpyImplOnce(canisterId.toString(), (_req, res) => {
      res.status(200).send(responseBody);
    });

    // advance to go over the max ingress expiry (5 minutes)
    advanceTimeByMilliseconds(6 * MINUTE_TO_MSECS);

    const { responseBody: subnetResponseBody } = await prepareV2ReadStateSubnetResponse({
      nodeIdentity,
      canisterRanges: [[canisterId.toUint8Array(), canisterId.toUint8Array()]],
      keyPair: subnetKeyPair,
      date: now,
    });
    mockReplica.setV2ReadStateSpyImplOnce(canisterId.toString(), (_req, res) => {
      res.status(200).send(subnetResponseBody);
    });

    expect.assertions(5);

    try {
      await actor[greetMethodName](greetReq);
    } catch (e) {
      expectCertificateOutdatedError(e);
    }

    expect(mockReplica.getV2QuerySpy(canisterId.toString())).toHaveBeenCalledTimes(4);
    expect(mockReplica.getV2ReadStateSpy(canisterId.toString())).toHaveBeenCalledTimes(1);
  });

  it('should not retry if the timestamp is outside the max ingress expiry (verifyQuerySignatures=false)', async () => {
    const agent = await HttpAgent.create({
      host: mockReplica.address,
      rootKey: subnetKeyPair.publicKeyDer,
      identity,
      retryTimes: 3,
      verifyQuerySignatures: false,
    });
    const actor = await createActor(canisterId, { agent });
    const sender = identity.getPrincipal();

    const { responseBody } = await prepareV2QueryResponse({
      canisterId,
      methodName: greetMethodName,
      arg: greetArgs,
      sender,
      reply: greetReply,
      nodeIdentity,
      date: now,
    });
    mockReplica.setV2QuerySpyImplOnce(canisterId.toString(), (_req, res) => {
      res.status(200).send(responseBody);
    });

    // advance to go over the max ingress expiry (5 minutes)
    advanceTimeByMilliseconds(6 * MINUTE_TO_MSECS);

    mockReplica.setV2ReadStateSpyImplOnce(canisterId.toString(), (_req, res) => {
      res.status(500).send('Should not be called');
    });

    const actorResponse = await actor[greetMethodName](greetReq);

    expect(actorResponse).toEqual(greetRes);
    expect(mockReplica.getV2QuerySpy(canisterId.toString())).toHaveBeenCalledTimes(1);
    expect(mockReplica.getV2ReadStateSpy(canisterId.toString())).toHaveBeenCalledTimes(0);
  });

  it.each([
    ['past', -(6 * MINUTE_TO_MSECS)],
    ['future', 6 * MINUTE_TO_MSECS],
  ])(
    'should account for local clock drift (more than 5 minutes in the %s)',
    async (_, timeDiffMsecs) => {
      const replicaDate = new Date(now.getTime() + timeDiffMsecs);
      await mockSyncTimeResponse({ mockReplica, keyPair: subnetKeyPair, date: replicaDate });

      const agent = await HttpAgent.create({
        host: mockReplica.address,
        rootKey: subnetKeyPair.publicKeyDer,
        identity,
        shouldSyncTime: true,
        retryTimes: 0,
      });
      const actor = await createActor(canisterId, { agent });
      const sender = identity.getPrincipal();

      const { responseBody, requestId } = await prepareV2QueryResponse({
        canisterId,
        methodName: greetMethodName,
        arg: greetArgs,
        sender,
        reply: greetReply,
        nodeIdentity,
        timeDiffMsecs,
        date: replicaDate,
      });
      mockReplica.setV2QuerySpyImplOnce(canisterId.toString(), (_req, res) => {
        res.status(200).send(responseBody);
      });

      const { responseBody: subnetResponseBody } = await prepareV2ReadStateSubnetResponse({
        nodeIdentity,
        canisterRanges: [[canisterId.toUint8Array(), canisterId.toUint8Array()]],
        keyPair: subnetKeyPair,
        date: replicaDate,
      });
      mockReplica.setV2ReadStateSpyImplOnce(canisterId.toString(), (_req, res) => {
        res.status(200).send(subnetResponseBody);
      });

      const actorResponse = await actor[greetMethodName](greetReq);

      expect(actorResponse).toEqual(greetRes);
      expect(mockReplica.getV2QuerySpy(canisterId.toString())).toHaveBeenCalledTimes(1);
      expect(mockReplica.getV2ReadStateSpy(canisterId.toString())).toHaveBeenCalledTimes(1);

      const req = mockReplica.getV2QueryReq(canisterId.toString(), 0);
      expect(requestIdOf(req.content)).toEqual(requestId);
    },
  );

  it('should fail if clock is drifted by more than 5 minutes in the past without syncing it', async () => {
    const timeDiffMsecs = -(6 * MINUTE_TO_MSECS);
    const replicaDate = new Date(now.getTime() + timeDiffMsecs);

    const agent = await HttpAgent.create({
      host: mockReplica.address,
      rootKey: subnetKeyPair.publicKeyDer,
      identity,
      shouldSyncTime: false,
      retryTimes: 0,
    });
    const actor = await createActor(canisterId, { agent });
    const sender = identity.getPrincipal();

    const { responseBody } = await prepareV2QueryResponse({
      canisterId,
      methodName: greetMethodName,
      arg: greetArgs,
      sender,
      reply: greetReply,
      nodeIdentity,
      timeDiffMsecs: 0, // sync time is disabled
      date: replicaDate,
    });
    mockReplica.setV2QuerySpyImplOnce(canisterId.toString(), (_req, res) => {
      res.status(200).send(responseBody);
    });

    const { responseBody: subnetResponseBody } = await prepareV2ReadStateSubnetResponse({
      nodeIdentity,
      canisterRanges: [[canisterId.toUint8Array(), canisterId.toUint8Array()]],
      keyPair: subnetKeyPair,
      date: replicaDate,
    });
    mockReplica.setV2ReadStateSpyImplOnce(canisterId.toString(), (_req, res) => {
      res.status(200).send(subnetResponseBody);
    });

    expect.assertions(4);

    try {
      await actor[greetMethodName](greetReq);
    } catch (e) {
      expectCertificateOutdatedError(e);
    }

    expect(mockReplica.getV2QuerySpy(canisterId.toString())).toHaveBeenCalledTimes(1);
  });

  it('should succeed if clock is drifted by more than 5 minutes in the future without syncing it', async () => {
    const timeDiffMsecs = 6 * MINUTE_TO_MSECS;
    const replicaDate = new Date(now.getTime() + timeDiffMsecs);

    const agent = await HttpAgent.create({
      host: mockReplica.address,
      rootKey: subnetKeyPair.publicKeyDer,
      identity,
      shouldSyncTime: false,
      retryTimes: 0,
    });
    const actor = await createActor(canisterId, { agent });
    const sender = identity.getPrincipal();

    const { responseBody, requestId } = await prepareV2QueryResponse({
      canisterId,
      methodName: greetMethodName,
      arg: greetArgs,
      sender,
      reply: greetReply,
      nodeIdentity,
      timeDiffMsecs: 0, // sync time is disabled
      date: replicaDate,
    });
    mockReplica.setV2QuerySpyImplOnce(canisterId.toString(), (_req, res) => {
      res.status(200).send(responseBody);
    });

    const { responseBody: subnetResponseBody } = await prepareV2ReadStateSubnetResponse({
      nodeIdentity,
      canisterRanges: [[canisterId.toUint8Array(), canisterId.toUint8Array()]],
      keyPair: subnetKeyPair,
      date: replicaDate,
    });
    mockReplica.setV2ReadStateSpyImplOnce(canisterId.toString(), (_req, res) => {
      res.status(200).send(subnetResponseBody);
    });
    mockReplica.setV2ReadStateSpyImplOnce(canisterId.toString(), (_req, res) => {
      res.status(200).send(subnetResponseBody);
    });

    const actorResponse = await actor[greetMethodName](greetReq);

    expect(actorResponse).toEqual(greetRes);
    expect(mockReplica.getV2QuerySpy(canisterId.toString())).toHaveBeenCalledTimes(1);
    expect(mockReplica.getV2ReadStateSpy(canisterId.toString())).toHaveBeenCalledTimes(1);

    const req = mockReplica.getV2QueryReq(canisterId.toString(), 0);
    expect(requestIdOf(req.content)).toEqual(requestId);
  });
});

function advanceTimeByMilliseconds(milliseconds: number) {
  const currentTime = vi.getMockedSystemTime()!;
  vi.setSystemTime(new Date(currentTime.getTime() + milliseconds));
}

function expectCertificateOutdatedError(e: unknown) {
  expect(e).toBeInstanceOf(TrustError);
  const err = e as TrustError;
  expect(err.cause.code).toBeInstanceOf(CertificateOutdatedErrorCode);
  expect(err.message).toContain('Certificate is stale');
}

async function mockSyncTimeResponse({
  mockReplica,
  keyPair,
  date,
  canisterId,
}: {
  mockReplica: MockReplica;
  keyPair: KeyPair;
  date?: Date;
  canisterId?: Principal | string;
}) {
  canisterId = Principal.from(canisterId ?? ICP_LEDGER).toText();
  const { responseBody: timeResponseBody } = await prepareV2ReadStateTimeResponse({
    keyPair,
    date,
  });
  mockReplica.setV2ReadStateSpyImplOnce(canisterId, (_req, res) => {
    res.status(200).send(timeResponseBody);
  });
  mockReplica.setV2ReadStateSpyImplOnce(canisterId, (_req, res) => {
    res.status(200).send(timeResponseBody);
  });
  mockReplica.setV2ReadStateSpyImplOnce(canisterId, (_req, res) => {
    res.status(200).send(timeResponseBody);
  });
}
