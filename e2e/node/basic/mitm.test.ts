import counterCanister from "../canisters/counter";

if (!process.env["MITM"]) test.only('skip mitm test', () => {
  console.warn('Skip mitm test. Set MITM env var and start mitmdump to enable the test');
});

test("mitm greet", async () => {
  const { actor: counter } = await counterCanister();
  await expect(counter.greet("counter")).rejects.toThrow(/Fail to verify certificate/);
  expect(await counter.queryGreet("counter")).toEqual("Hullo, counter!");
});

