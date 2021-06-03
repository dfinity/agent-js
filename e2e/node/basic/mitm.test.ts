import counterCanister from '../canisters/counter';

let mitmTest = test;
if (!process.env['MITM']) {
  mitmTest = test.skip;
}

mitmTest('mitm greet', async () => {
  const { actor: counter } = await counterCanister();
  await expect(counter.greet('counter')).rejects.toThrow(/Fail to verify certificate/);
  expect(await counter.queryGreet('counter')).toEqual('Hullo, counter!');
});
