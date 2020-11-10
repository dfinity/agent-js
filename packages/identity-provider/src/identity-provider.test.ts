import { getRequiredQueryParams, redirectToCanister } from './identity-provider';
import * as CONSTANTS from './utils/constants';

let originalLocation: Location;
let mockResponse: jest.Mock<any, any>;

beforeAll(() => {
  originalLocation = window.location;
  mockResponse = jest.fn();
  Object.defineProperty(window, 'location', {
    value: {
      hash: {
        endsWith: mockResponse,
        includes: mockResponse,
      },
      assign: mockResponse,
      replace: mockResponse,
      search: '',
    },
    writable: true,
  });
});

afterEach(() => {
  mockResponse.mockClear();
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

  describe('redirecttoCanister()', () => {
    test('should handle redirect appending token param', () => {
      window.location.search = '?redirect=http%3A%2F%2Flocalhost%3A8080&public_key=fakekey';
      redirectToCanister('tokeny-token');
      expect(mockResponse).toHaveBeenCalledWith('http://localhost:8080/?token=tokeny-token');
    });

    test('should handle redirect when params exist token param', () => {
      window.location.search =
        '?redirect=http%3A%2F%2Flocalhost%3A8080%2F%3FcanisterId%3Dcxeji-wacaa-aaaaa-aaaaa-aaaaa-aaaaa-aaaaa-q&public_key=fakekey';
      redirectToCanister('tokeny-token');
      expect(mockResponse).toHaveBeenCalledWith(
        'http://localhost:8080/?canisterId=cxeji-wacaa-aaaaa-aaaaa-aaaaa-aaaaa-aaaaa-q&token=tokeny-token',
      );
    });
  });
});
