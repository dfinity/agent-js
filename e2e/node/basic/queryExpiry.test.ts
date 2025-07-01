import { beforeEach, describe, it, vi, expect } from 'vitest';
import {
  MockReplica,
  prepareV2QueryResponse,
  prepareV2ReadStateSubnetResponse,
} from '../utils/mock-replica';
import { IDL } from '@dfinity/icp/candid';
import { Principal } from '@dfinity/icp/principal';
import { randomIdentity, randomKeyPair } from '../utils/identity';
import {
  CertificateOutdatedErrorCode,
  HttpAgent,
  requestIdOf,
  TrustError,
} from '@dfinity/icp/agent';
import { createActor } from '../canisters/counter';

const MILLISECONDS_PER_MINUTE = 60 * 1000;

describe('queryExpiry', () => {
  const date = new Date('2025-05-01T12:34:56.789Z');
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

    vi.setSystemTime(date);
  });

  it('should not retry if the timestamp is within the max ingress expiry', async () => {
    const agent = await HttpAgent.create({
      host: mockReplica.address,
      rootKey: subnetKeyPair.publicKeyDer,
      identity,
      shouldSyncTime: false,
    });
    const actor = await createActor(canisterId, { agent });
    const sender = identity.getPrincipal();

    const { responseBody, requestId } = await prepareV2QueryResponse({
      canisterId,
      methodName: greetMethodName,
      arg: greetArgs,
      sender,
      reply: greetReply,
      ingressExpiryInMinutes: 5,
      nodeIdentity,
      date,
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
      shouldSyncTime: false,
      ingressExpiryInMinutes: 5,
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
      ingressExpiryInMinutes: 5,
      nodeIdentity,
      date,
    });
    mockReplica.setV2QuerySpyImplOnce(canisterId.toString(), (_req, res) => {
      res.status(200).send(responseBody);
    });

    // advance to go over the max ingress expiry (5 minutes)
    advanceTimeByMilliseconds(6 * MILLISECONDS_PER_MINUTE);

    const { responseBody: subnetResponseBody } = await prepareV2ReadStateSubnetResponse({
      nodeIdentity,
      canisterRanges: [[canisterId.toUint8Array(), canisterId.toUint8Array()]],
      keyPair: subnetKeyPair,
      date,
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
      shouldSyncTime: false,
      ingressExpiryInMinutes: 5,
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
      ingressExpiryInMinutes: 5,
      nodeIdentity,
      date,
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
    advanceTimeByMilliseconds(6 * MILLISECONDS_PER_MINUTE);

    const { responseBody: subnetResponseBody } = await prepareV2ReadStateSubnetResponse({
      nodeIdentity,
      canisterRanges: [[canisterId.toUint8Array(), canisterId.toUint8Array()]],
      keyPair: subnetKeyPair,
      date,
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
    const ingressExpiryInMinutes = 5;
    const agent = await HttpAgent.create({
      host: mockReplica.address,
      rootKey: subnetKeyPair.publicKeyDer,
      identity,
      ingressExpiryInMinutes,
      retryTimes: 3,
      shouldSyncTime: false,
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
      ingressExpiryInMinutes,
      nodeIdentity,
      date,
    });
    mockReplica.setV2QuerySpyImplOnce(canisterId.toString(), (_req, res) => {
      res.status(200).send(responseBody);
    });

    // advance to go over the max ingress expiry (5 minutes)
    advanceTimeByMilliseconds(6 * MILLISECONDS_PER_MINUTE);

    const { responseBody: subnetResponseBody } = await prepareV2ReadStateSubnetResponse({
      nodeIdentity,
      canisterRanges: [[canisterId.toUint8Array(), canisterId.toUint8Array()]],
      keyPair: subnetKeyPair,
      date,
    });
    mockReplica.setV2ReadStateSpyImplOnce(canisterId.toString(), (_req, res) => {
      res.status(200).send(subnetResponseBody);
    });

    const actorResponse = await actor[greetMethodName](greetReq);

    expect(actorResponse).toEqual(greetRes);
    expect(mockReplica.getV2QuerySpy(canisterId.toString())).toHaveBeenCalledTimes(1);
    expect(mockReplica.getV2ReadStateSpy(canisterId.toString())).toHaveBeenCalledTimes(0);
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
