import { getRequiredQueryParams } from './identity-provider';
import * as CONSTANTS from './utils/constants';

let mockResponse: jest.Mock<any, any>;
beforeAll(() => {
  mockResponse = jest.fn();
});

afterEach(() => {
  mockResponse.mockClear();
});

describe('@dfinity/identity-provider', () => {
  describe('getRequiredQueryParams', () => {
    test('identity provider should pull query parameters', () => {
      const search = '?redirect_uri=bar&login_hint=fakekey';
      const queryParams = getRequiredQueryParams(search);
      expect(queryParams.redirectURI).toEqual('bar');
      expect(queryParams.loginHint).toEqual('fakekey');
    });

    test('should fail when redirect_uri not found', () => {
      expect(() => {
        const search = '?login_hint=fakekey';
        getRequiredQueryParams(search);
      }).toThrowError(CONSTANTS.NO_REDIRECT);
    });

    test('should fail when login_hint not found', () => {
      expect(() => {
        const search = '?redirect_uri=true';
        getRequiredQueryParams(search);
      }).toThrowError(CONSTANTS.NO_PUBKEY);
    });

    test('should handle URL encoding', () => {
      const fancyURL = 'http://localhost:8080/?canisterId=12345';
      const keyParam = 'login_hint=locked';
      const urlEncodedURL = encodeURIComponent(fancyURL);
      const searchParams = '?redirect_uri=' + urlEncodedURL + '&' + keyParam;
      const params = getRequiredQueryParams(searchParams);
      expect(params.redirectURI).toEqual(fancyURL);
    });
  });
});
