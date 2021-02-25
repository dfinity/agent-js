import { Principal } from './principal';


describe('Principal', () => {
  it('encodes properly', () => {
    expect(Principal.fromHex('efcdab000000000001').toText()).toBe('2chl6-4hpzw-vqaaa-aaaaa-c');
    expect(Principal.fromHex('').toText()).toBe('aaaaa-aa');
    expect(Principal.anonymous().toText()).toBe('2vxsx-fae');
  });

  it('parses properly', () => {
    expect(Principal.fromText('2chl6-4hpzw-vqaaa-aaaaa-c').toHex()).toBe('EFCDAB000000000001');
    expect(Principal.fromText('aaaaa-aa').toHex()).toBe('');
    expect(Principal.fromText('2vxsx-fae').toHex()).toBe('04');
    expect(Principal.fromText('2vxsx-fae').isAnonymous()).toBe(true);
  });

  it('errors out on parsing invalid characters', () => {
    expect(() => Principal.fromText('Hello world!')).toThrow();
  });
});

