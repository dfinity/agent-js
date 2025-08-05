import { beforeEach, describe, it, vi, expect } from 'vitest';
import {
  MockReplica,
  mockSyncTimeResponse,
  prepareV2QueryResponse,
  prepareV2ReadStateSubnetResponse,
} from '../utils/mock-replica.ts';
import { IDL } from '@icp-sdk/core/candid';
import { Principal } from '@icp-sdk/core/principal';
import { randomIdentity, randomKeyPair } from '../utils/identity.ts';
import {
  CertificateOutdatedErrorCode,
  HttpAgent,
  requestIdOf,
  TrustError,
} from '@icp-sdk/core/agent';
import { createActor } from '../canisters/counter.ts';

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
    const timeDiffMsecs = 6 * MINUTE_TO_MSECS;
    const futureDate = new Date(now.getTime() + timeDiffMsecs);

    // advance to go over the max ingress expiry (5 minutes)
    advanceTimeByMilliseconds(timeDiffMsecs);

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
    const { responseBody: subnetResponseBody } = await prepareV2ReadStateSubnetResponse({
      nodeIdentity,
      canisterRanges: [[canisterId.toUint8Array(), canisterId.toUint8Array()]],
      keyPair: subnetKeyPair,
      date: futureDate, // make sure the certificate is fresh for this call
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

  it('should retry and fail if the timestamp is outside the max ingress expiry (with retry)', async () => {
    const timeDiffMsecs = 6 * MINUTE_TO_MSECS;
    const futureDate = new Date(now.getTime() + timeDiffMsecs);

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
    advanceTimeByMilliseconds(timeDiffMsecs);

    const { responseBody: subnetResponseBody } = await prepareV2ReadStateSubnetResponse({
      nodeIdentity,
      canisterRanges: [[canisterId.toUint8Array(), canisterId.toUint8Array()]],
      keyPair: subnetKeyPair,
      date: now,
    });
    // fetch subnet keys, fails for certificate freshness checks
    mockReplica.setV2ReadStateSpyImplOnce(canisterId.toString(), (_req, res) => {
      res.status(200).send(subnetResponseBody);
    });
    // sync time, keeping a date in the future to make sure the agent still has outdated time
    await mockSyncTimeResponse({
      mockReplica,
      keyPair: subnetKeyPair,
      date: futureDate,
      canisterId,
    });

    expect.assertions(5);

    try {
      await actor[greetMethodName](greetReq);
    } catch (e) {
      expectCertificateOutdatedError(e);
    }

    expect(mockReplica.getV2QuerySpy(canisterId.toString())).toHaveBeenCalledTimes(4);
    expect(mockReplica.getV2ReadStateSpy(canisterId.toString())).toHaveBeenCalledTimes(4);
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
      await mockSyncTimeResponse({
        mockReplica,
        keyPair: subnetKeyPair,
        date: replicaDate,
        canisterId: ICP_LEDGER,
      });

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
    await mockSyncTimeResponse({
      mockReplica,
      keyPair: subnetKeyPair,
      date: replicaDate,
      canisterId,
    });
    mockReplica.setV2ReadStateSpyImplOnce(canisterId.toString(), (_req, res) => {
      res.status(200).send(subnetResponseBody);
    });

    const actorResponse = await actor[greetMethodName](greetReq);

    expect(actorResponse).toEqual(greetRes);
    expect(mockReplica.getV2QuerySpy(canisterId.toString())).toHaveBeenCalledTimes(1);
    expect(mockReplica.getV2ReadStateSpy(canisterId.toString())).toHaveBeenCalledTimes(4);

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
