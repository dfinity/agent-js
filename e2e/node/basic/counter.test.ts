/**
 * @jest-environment node
 */
import counterCanister from '../canisters/counter';

test('counter', async () => {
  jest.setTimeout(30000);
  const { actor: counter } = await counterCanister();
  expect(await counter.greet('counter')).toEqual('Hello, counter!');
  expect(Number(await counter.read())).toEqual(0);
  await counter.inc();
  expect(Number(await counter.read())).toEqual(1);
  await counter.inc();
  expect(Number(await counter.read())).toEqual(2);
});
