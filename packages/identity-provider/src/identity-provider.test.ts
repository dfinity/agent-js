import { getQueryParams } from './identity-provider';
import { CONSTANTS } from './utils/constants';
beforeAll(() => {
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
describe('@dfinity/identity-provider', () => {
  test('identity provider should pull query parameters', () => {
    window.location.search = '?redirect=bar&public_key=fakekey';
    const queryParams = getQueryParams();
    expect(queryParams.length).toEqual(2);
  });

  test('getQueryParams should fail when redirect not found', () => {
    expect(() => {
      window.location.search = '?public_key=fakekey';
      getQueryParams();
    }).toThrowError(CONSTANTS.NO_REDIRECT);
  });

  test('getQueryParams should fail when public_key not found', () => {
    expect(() => {
      window.location.search = '?redirect=true';
      getQueryParams();
    }).toThrowError(CONSTANTS.NO_PUBKEY);
  });
});
