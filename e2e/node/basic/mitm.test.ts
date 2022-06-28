/**
 * @jest-environment node
 */
import counterCanister from '../canisters/counter';

let mitmTest = test;
if (!process.env['MITM']) {
  mitmTest = test.skip;
}

jest.setTimeout(30000);
mitmTest('mitm greet', async () => {
  const { actor: counter } = await counterCanister();
  await expect(counter.greet('counter')).rejects.toThrow(/Invalid certificate/);
  expect(await counter.queryGreet('counter')).toEqual('Hullo, counter!');
});
