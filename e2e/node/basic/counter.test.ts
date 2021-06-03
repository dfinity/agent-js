import counterCanister from '../canisters/counter';

test('counter', async () => {
  const { actor: counter } = await counterCanister();
  expect(await counter.greet('counter')).toEqual('Hello, counter!');
  expect(Number(await counter.read())).toEqual(0);
  await counter.inc();
  expect(Number(await counter.read())).toEqual(1);
  await counter.inc();
  expect(Number(await counter.read())).toEqual(2);
});
