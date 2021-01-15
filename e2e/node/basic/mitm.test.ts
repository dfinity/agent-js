import counterCanister from "../canisters/counter";

test("mitm greet", async () => {
  if (process.env["MITM"]) {
    const { actor: counter } = await counterCanister();
    await expect(counter.greet("counter")).rejects.toThrow(/Fail to verify certificate/);
    expect(await counter.queryGreet("counter")).toEqual("Hullo, counter!");
  }
});
