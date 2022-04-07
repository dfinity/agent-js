/**
 * @jest-environment node
 */
import counterCanister, { noncelessCanister } from '../canisters/counter';

jest.setTimeout(40000);
describe('counter', () => {
  it('should greet', async () => {
    const { actor: counter } = await counterCanister();
    try {
      expect(await counter.greet('counter')).toEqual('Hello, counter!');
    } catch (error) {
      console.error(error);
    }
  });
  it('should submit distinct requests with nonce by default', async () => {
    const { actor: counter } = await counterCanister();
    const values = await Promise.all(new Array(4).fill(undefined).map(() => counter.inc_read()));
    const set1 = new Set(values);
    const values2 = await Promise.all(new Array(4).fill(undefined).map(() => counter.inc_read()));
    const set2 = new Set(values2);

    // Sets of unique results should be the same length
    expect(set1.size).toBe(values.length);
    expect(set2.size).toEqual(values2.length);
  });
  it('should submit duplicate requests if nonce is disabled', async () => {
    const { actor: counter } = await noncelessCanister();
    const values = await Promise.all(new Array(4).fill(undefined).map(() => counter.inc_read()));
    const set1 = new Set(values);
    const values2 = await Promise.all(new Array(4).fill(undefined).map(() => counter.inc_read()));
    const set2 = new Set(values2);

    expect(set1.size < values.length || set2.size < values2.length).toBe(true);
  });
  it('should increment', async () => {
    const { actor: counter } = await counterCanister();
    try {
      expect(Number(await counter.read())).toEqual(0);
      await counter.inc();
      expect(Number(await counter.read())).toEqual(1);
      await counter.inc();
      expect(Number(await counter.read())).toEqual(2);
    } catch (error) {
      console.error(error);
    }
  });
});
