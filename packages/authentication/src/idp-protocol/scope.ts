import { Principal } from '@dfinity/agent';

export type ICanisterScope = {
  type: 'CanisterScope';
  principal: Principal;
};

export type Scope = Array<ICanisterScope>;

/**
 * Parse an ic-id-protocol AuthenticationRequest.scope string.
 * Per-OAuth2, it's a space-delimited array of strings.
 * This should split on space, then look for certain allowed kinds of strings,
 * and return objects that represent our decoding/interpretation of the strings.
 *
 * The original motivation for this is that a scope string can be 'canisterAPrincipalText canisterBPrincipalText',
 * and we want this to parse that into an array of two 'CanisterScope' objects.
 *
 *
 * @param {string} scopeString - space-delimited string from ic-id AuthenticationRequest.scope
 * @returns {Scope} parsed scopeString scopes of known scope types
 * @todo This should ensure there are exactly one or two CanisterScopes,
 *   (see spec for more restrictions on 'scope')
 */
export function parseScopeString(scopeString: string): Scope {
  const scopeSegments = scopeString.split(' ').filter(Boolean);
  const canisterScopes: ICanisterScope[] = scopeSegments.map(principalText => {
    const principal: Principal = (() => {
      try {
        return Principal.fromText(principalText);
      } catch (error) {
        console.error('Error decoding scope segment as Principal Text', error);
        throw error;
      }
    })();
    const scope: ICanisterScope = {
      type: 'CanisterScope',
      principal,
    };
    return scope;
  });
  const scope: Scope = canisterScopes;
  return scope;
}

/**
 * Convert an IParsedScopeString back to a space-delimited string like that used in AuthenticationResponse
 *
 * @param scope previously-parsed scope descriptor objects that shuld be re-stringified
 * @returns space-delimited scope string for oauth2
 */
export function stringifyScope(scope: Scope): string {
  const scopeSegments = [...scope.map(cs => cs.principal.toText())];
  return scopeSegments.join(' ');
}
