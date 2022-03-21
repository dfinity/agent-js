/**
 * @jest-environment node
 */
import counterCanister from '../canisters/counter';

describe('counter', async () => {
  const { actor: counter } = await counterCanister();
  it('should greet', async () => {
    const result = await counter.greet('counter');
    console.log('greet result: ', result);
    expect(result).toEqual('Hello, counter!');
  });
  it('should increment', async () => {
    console.log('value: ', await counter.read());
    expect(Number(await counter.read())).toEqual(0);
    await counter.inc();
    // expect(Number(await counter.read())).toEqual(1);
    // await counter.inc();
    // expect(Number(await counter.read())).toEqual(2);
  });
});
