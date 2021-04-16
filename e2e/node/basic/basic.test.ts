import {
  blobFromText,
  Certificate,
  getManagementCanister,
  IDL,
  Principal,
} from "@dfinity/agent";
import agent from "../utils/agent";
import { Buffer } from "buffer/";

test("read_state", async () => {
  const now = Date.now() / 1000;
  const path = [blobFromText("time")];
  const response = await agent.readState(Principal.fromHex('00000000000000000001'), { paths: [path] });
  const cert = new Certificate(response, agent);

  expect(() => cert.lookup(path)).toThrow(
    /Cannot lookup unverified certificate/
  );
  expect(await cert.verify()).toBe(true);
  expect(cert.lookup([blobFromText("Time")])).toBe(undefined);
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const rawTime = cert.lookup(path)!;
  const decoded = IDL.decode(
    [IDL.Nat],
    Buffer.concat([Buffer.from("DIDL\x00\x01\x7d"), rawTime])
  )[0];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const time = Number(decoded as any) / 1e9;
  // The diff between decoded time and local time is within 5s
  expect(Math.abs(time - now) < 5).toBe(true);
});

test("createCanister", async () => {
  // Make sure this doesn't fail.
  await getManagementCanister({ agent }).provisional_create_canister_with_cycles({ amount: [1e12] });
});

test("withOptions", async () => {
  // Make sure this fails.
  await expect((async () => {
    await getManagementCanister({ agent }).provisional_create_canister_with_cycles.withOptions({
      canisterId: 'abcde-gghhi',
    })({ amount: [1e12] });
  })())
    .rejects
    .toThrow();

  // Make sure this doesn't fail.
  await getManagementCanister({ agent }).provisional_create_canister_with_cycles({ amount: [1e12 ]});
});
