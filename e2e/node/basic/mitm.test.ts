import counterCanister from "../canisters/counter";

test("mitm counter", async () => {
  if (process.env["MITM"]) {
    const { actor: counter } = await counterCanister();
    //expect(await counter.greet("counter")).toEqual("Hello, counter!");
    await expect(counter.greet("counter")).rejects.toThrow(/Fail to verify certificate/);
    expect(await counter.queryGreet("counter")).toEqual("Hullo, counter!");
  }
});
