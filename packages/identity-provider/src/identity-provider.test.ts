import { getRequiredQueryParams } from './identity-provider';
import * as CONSTANTS from './utils/constants';

let originalLocation: Location;
beforeAll(() => {
  originalLocation = window.location;
  const mockResponse = jest.fn();
  Object.defineProperty(window, 'location', {
    value: {
      hash: {
        endsWith: mockResponse,
        includes: mockResponse,
      },
      assign: mockResponse,
      search: '',
    },
    writable: true,
  });
});

afterAll(() => {
  window.location = originalLocation;
});
describe('@dfinity/identity-provider', () => {
  describe('getRequiredQueryParams', () => {
    test('identity provider should pull query parameters', () => {
      window.location.search = '?redirect=bar&public_key=fakekey';
      const queryParams = getRequiredQueryParams();
      expect(queryParams.redirect).toEqual('bar');
      expect(queryParams.publicKey).toEqual('fakekey');
    });

    test('should fail when redirect not found', () => {
      expect(() => {
        window.location.search = '?public_key=fakekey';
        getRequiredQueryParams();
      }).toThrowError(CONSTANTS.NO_REDIRECT);
    });

    test('should fail when public_key not found', () => {
      expect(() => {
        window.location.search = '?redirect=true';
        getRequiredQueryParams();
      }).toThrowError(CONSTANTS.NO_PUBKEY);
    });

    test('should handle URL encoding', () => {
      const fancyURL = 'http://localhost:8080/?canisterId=12345';
      const keyParam = 'public_key=locked';
      const urlEncodedURL = encodeURIComponent(fancyURL);
      const searchParams = '?redirect=' + urlEncodedURL + '&' + keyParam;
      window.location.search = searchParams;
      const params = getRequiredQueryParams();
      expect(params.redirect).toEqual(fancyURL);
    });
  });
});
