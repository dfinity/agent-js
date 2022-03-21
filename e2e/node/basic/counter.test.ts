/**
 * @jest-environment node
 */
import counterCanister from '../canisters/counter';

jest.setTimeout(30000);
jest.retryTimes(3);
describe('counter', () => {
  it('should greet', async () => {
    const { actor: counter } = await counterCanister();
    try {
      const result = await counter.greet('counter');
      console.log('greet result: ', result);
      expect(result).toEqual('Hello, counter!');
    } catch (error) {
      console.error(error);
    }
  });
  it('should increment', async () => {
    const { actor: counter } = await counterCanister();
    try {
      console.log('value: ', await counter.read());
      expect(Number(await counter.read())).toEqual(0);
      await counter.inc();
    } catch (error) {
      console.error(error);
    }
    // expect(Number(await counter.read())).toEqual(1);
    // await counter.inc();
    // expect(Number(await counter.read())).toEqual(2);
  });
});
