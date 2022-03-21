/**
 * @jest-environment node
 */
import counterCanister from '../canisters/counter';

jest.setTimeout(30000);
describe('counter', () => {
  it('should greet', async () => {
    const { actor: counter } = await counterCanister();
    try {
      expect(await counter.greet('counter')).toEqual('Hello, counter!');
    } catch (error) {
      console.error(error);
    }
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
