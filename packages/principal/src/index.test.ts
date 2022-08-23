import { Principal, PrincipalBase } from '.';
import { Principal as PrincipalLegacy } from '@dfinity/principal-legacy';

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

  it('errors out on invalid checksums', () => {
    // These are taken from above with the first character changed to make an invalid crc32.
    expect(() => Principal.fromText('0chl6-4hpzw-vqaaa-aaaaa-c').toHex()).toThrow();
    expect(() => Principal.fromText('0aaaa-aa').toHex()).toThrow();
    expect(() => Principal.fromText('0vxsx-fae').toHex()).toThrow();
  });

  it('errors out on parsing invalid characters', () => {
    expect(() => Principal.fromText('Hello world!')).toThrow();
  });

  it('compares principals correctly', () => {
    const anonymous = Principal.anonymous();
    const principal1 = Principal.fromText('ryjl3-tyaaa-aaaaa-aaaba-cai');
    const principal2 = Principal.fromText('ivg37-qiaaa-aaaab-aaaga-cai');
    for (const p of [anonymous, principal1, principal2]) {
      expect(p.compareTo(p)).toBe('eq');
      expect(p.ltEq(p)).toBe(true);
      expect(p.gtEq(p)).toBe(true);
    }
    expect(principal1.compareTo(principal2)).toBe('lt');
    expect(principal1.compareTo(anonymous)).toBe('lt');
    expect(principal2.compareTo(principal1)).toBe('gt');
    expect(principal2.compareTo(anonymous)).toBe('lt');
    expect(anonymous.compareTo(principal1)).toBe('gt');
    expect(anonymous.compareTo(principal2)).toBe('gt');
  });
});

describe('backwards compatibility with 0.9.3', () => {
  test('import from 0.9.3 principal', () => {
    const testPrincipal = PrincipalLegacy.anonymous();
    expect(Principal.from(testPrincipal)).toMatchInlineSnapshot(`
      Principal {
        "_arr": Uint8Array [
          4,
        ],
        "_isPrincipal": true,
      }
    `);
  });
  test('alignment on resolution', () => {
    expect(PrincipalLegacy.fromHex('efcdab000000000001').toText()).toBe(
      '2chl6-4hpzw-vqaaa-aaaaa-c',
    );
    const anonymous = Principal.anonymous();
    const anonymousLegacy = Principal.anonymous();
    expect(anonymous.toText()).toMatch(anonymousLegacy.toText());

    const principal1 = Principal.fromText('ryjl3-tyaaa-aaaaa-aaaba-cai');
    const principal2 = PrincipalLegacy.fromText('ivg37-qiaaa-aaaab-aaaga-cai');

    expect(principal1.compareTo(principal2)).toBe('lt');
  });
  test('assignment to PrincipalBase', () => {
    const current = Principal.anonymous() as PrincipalBase;
    expect(current._isPrincipal).toBe(true);
    const legacy = PrincipalLegacy.anonymous() as PrincipalBase;
    expect(legacy._isPrincipal).toBe(true);
  });
});
