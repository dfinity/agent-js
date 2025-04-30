/** @module CanisterStatus */
import { Principal } from '@dfinity/principal';
import {
  CertificateVerificationErrorCode,
  MissingRootKeyErrorCode,
  CertificateNotAuthorizedErrorCode,
  LookupErrorCode,
  DerKeyLengthMismatchErrorCode,
  ExternalError,
  ProtocolError,
  TrustError,
  AgentError,
  UnknownError,
  HashTreeDecodeErrorCode,
  UnexpectedErrorCode,
  InputError,
} from '../errors';
import { HttpAgent } from '../agent/http';
import {
  Cert,
  Certificate,
  CreateCertificateOptions,
  flatten_forks,
  check_canister_ranges,
  LookupPathStatus,
  lookup_path,
  lookupResultToBuffer,
  lookup_subtree,
  LabeledHashTree,
  LookupSubtreeStatus,
} from '../certificate';
import { strToUtf8, toHex } from '@dfinity/candid';
import * as Cbor from '../cbor';
import { decodeLeb128, decodeTime } from '../utils/leb';
import { DerEncodedPublicKey } from '../auth';

/**
 * Represents the useful information about a subnet
 * @param {string} subnetId the principal id of the canister's subnet
 * @param {string[]} nodeKeys the keys of the individual nodes in the subnet
 */
export type SubnetStatus = {
  // Principal as a string
  subnetId: string;
  nodeKeys: Map<string, DerEncodedPublicKey>;
  metrics?: {
    num_canisters: bigint;
    canister_state_bytes: bigint;
    consumed_cycles_total: {
      current: bigint;
      deleted: bigint;
    };
    update_transactions_total: bigint;
  };
};

/**
 * Types of an entry on the canisterStatus map.
 * An entry of null indicates that the request failed, due to lack of permissions or the result being missing.
 */
export type Status =
  | string
  | Uint8Array
  | Date
  | Uint8Array[]
  | Principal[]
  | SubnetStatus
  | bigint
  | null;

/**
 * Interface to define a custom path. Nested paths will be represented as individual buffers, and can be created from text using TextEncoder.
 * @param {string} key the key to use to access the returned value in the canisterStatus map
 * @param {Uint8Array[]} path the path to the desired value, represented as an array of buffers
 * @param {string} decodeStrategy the strategy to use to decode the returned value
 */
export class CustomPath implements CustomPath {
  public key: string;
  public path: Uint8Array[] | string;
  public decodeStrategy: 'cbor' | 'hex' | 'leb128' | 'utf-8' | 'raw';
  constructor(
    key: string,
    path: Uint8Array[] | string,
    decodeStrategy: 'cbor' | 'hex' | 'leb128' | 'utf-8' | 'raw',
  ) {
    this.key = key;
    this.path = path;
    this.decodeStrategy = decodeStrategy;
  }
}

/**
 * @deprecated Use {@link CustomPath} instead
 * @param {string} key the key to use to access the returned value in the canisterStatus map
 * @param {string} path the path to the desired value, represented as a string
 * @param {string} decodeStrategy the strategy to use to decode the returned value
 */
export interface MetaData {
  kind: 'metadata';
  key: string;
  path: string | Uint8Array;
  decodeStrategy: 'cbor' | 'hex' | 'leb128' | 'utf-8' | 'raw';
}

/**
 * Pre-configured fields for canister status paths
 */
export type Path =
  | 'time'
  | 'controllers'
  | 'subnet'
  | 'module_hash'
  | 'candid'
  | MetaData
  | CustomPath;

export type StatusMap = Map<Path | string, Status>;

export type CanisterStatusOptions = {
  canisterId: Principal;
  agent: HttpAgent;
  paths?: Path[] | Set<Path>;
  blsVerify?: CreateCertificateOptions['blsVerify'];
};

/**
 * Request information in the request_status state tree for a given canister.
 * Can be used to request information about the canister's controllers, time, module hash, candid interface, and more.
 * @param {CanisterStatusOptions} options {@link CanisterStatusOptions}
 * @param {CanisterStatusOptions['canisterId']} options.canisterId {@link Principal}
 * @param {CanisterStatusOptions['agent']} options.agent {@link HttpAgent} optional authenticated agent to use to make the canister request. Useful for accessing private metadata under icp:private
 * @param {CanisterStatusOptions['paths']} options.paths {@link Path[]}
 * @returns {Status} object populated with data from the requested paths
 * @example
 * const status = await canisterStatus({
 *   paths: ['controllers', 'candid'],
 *   ...options
 * });
 *
 * const controllers = status.get('controllers');
 */
export const request = async (options: {
  canisterId: Principal;
  agent: HttpAgent;
  paths?: Path[] | Set<Path>;
}): Promise<StatusMap> => {
  const { agent, paths } = options;
  const canisterId = Principal.from(options.canisterId);

  const uniquePaths = [...new Set(paths)];

  // Map path options to their correct formats
  const encodedPaths = uniquePaths.map(path => {
    return encodePath(path, canisterId);
  });
  const status = new Map<string | Path, Status>();

  const promises = uniquePaths.map((path, index) => {
    return (async () => {
      try {
        const response = await agent.readState(canisterId, {
          paths: [encodedPaths[index]],
        });
        if (agent.rootKey == null) {
          throw ExternalError.fromCode(new MissingRootKeyErrorCode());
        }
        const cert = await Certificate.create({
          certificate: response.certificate,
          rootKey: agent.rootKey,
          canisterId: canisterId,
          disableTimeVerification: true,
        });

        const lookup = (cert: Certificate, path: Path) => {
          if (path === 'subnet') {
            if (agent.rootKey == null) {
              throw ExternalError.fromCode(new MissingRootKeyErrorCode());
            }
            const data = fetchNodeKeys(response.certificate, canisterId, agent.rootKey);
            return {
              path: path,
              data,
            };
          } else {
            return {
              path: path,
              data: lookupResultToBuffer(cert.lookup_path(encodePath(path, canisterId))),
            };
          }
        };

        // must pass in the rootKey if we have no delegation
        const { path, data } = lookup(cert, uniquePaths[index]);
        if (!data) {
          // Typically, the cert lookup will throw
          console.warn(`Expected to find result for path ${path}, but instead found nothing.`);
          if (typeof path === 'string') {
            status.set(path, null);
          } else {
            status.set(path.key, null);
          }
        } else {
          switch (path) {
            case 'time': {
              status.set(path, decodeTime(data));
              break;
            }
            case 'controllers': {
              status.set(path, decodeControllers(data));
              break;
            }
            case 'module_hash': {
              status.set(path, toHex(data));
              break;
            }
            case 'subnet': {
              status.set(path, data);
              break;
            }
            case 'candid': {
              status.set(path, new TextDecoder().decode(data));
              break;
            }
            default: {
              // Check for CustomPath signature
              if (typeof path !== 'string' && 'key' in path && 'path' in path) {
                switch (path.decodeStrategy) {
                  case 'raw':
                    status.set(path.key, data);
                    break;
                  case 'leb128': {
                    status.set(path.key, decodeLeb128(data));
                    break;
                  }
                  case 'cbor': {
                    status.set(path.key, Cbor.decode(data));
                    break;
                  }
                  case 'hex': {
                    status.set(path.key, toHex(data));
                    break;
                  }
                  case 'utf-8': {
                    status.set(path.key, new TextDecoder().decode(data));
                  }
                }
              }
            }
          }
        }
      } catch (error) {
        // Break on signature verification errors
        if (error instanceof AgentError && error.hasCode(CertificateVerificationErrorCode)) {
          throw error;
        }
        if (typeof path !== 'string' && 'key' in path && 'path' in path) {
          status.set(path.key, null);
        } else {
          status.set(path, null);
        }
        console.group();
        console.warn(`Expected to find result for path ${path}, but instead found nothing.`);
        console.warn(error);
        console.groupEnd();
      }
    })();
  });

  // Fetch all values separately, as each option can fail
  await Promise.all(promises);

  return status;
};

export const fetchNodeKeys = (
  certificate: Uint8Array,
  canisterId: Principal,
  root_key?: Uint8Array,
): SubnetStatus => {
  if (!canisterId._isPrincipal) {
    throw InputError.fromCode(new UnexpectedErrorCode('Invalid canisterId'));
  }
  const cert: Cert = Cbor.decode(certificate);
  const tree = cert.tree;
  let delegation = cert.delegation;
  let subnetId: Principal;
  if (delegation && delegation.subnet_id) {
    subnetId = Principal.fromUint8Array(new Uint8Array(delegation.subnet_id));
  }

  // On local replica, with System type subnet, there is no delegation
  else if (!delegation && typeof root_key !== 'undefined') {
    subnetId = Principal.selfAuthenticating(new Uint8Array(root_key));
    delegation = {
      subnet_id: subnetId.toUint8Array(),
      certificate: new Uint8Array(0),
    };
  }
  // otherwise use default NNS subnet id
  else {
    subnetId = Principal.selfAuthenticating(
      Principal.fromText(
        'tdb26-jop6k-aogll-7ltgs-eruif-6kk7m-qpktf-gdiqx-mxtrf-vb5e6-eqe',
      ).toUint8Array(),
    );
    delegation = {
      subnet_id: subnetId.toUint8Array(),
      certificate: new Uint8Array(0),
    };
  }

  const canisterInRange = check_canister_ranges({ canisterId, subnetId, tree });
  if (!canisterInRange) {
    throw TrustError.fromCode(
      new CertificateNotAuthorizedErrorCode(canisterId, delegation.subnet_id),
    );
  }

  const subnetLookupResult = lookup_subtree(['subnet', delegation.subnet_id, 'node'], tree);
  if (subnetLookupResult.status !== LookupSubtreeStatus.Found) {
    throw ProtocolError.fromCode(new LookupErrorCode('Node not found', subnetLookupResult.status));
  }
  if (subnetLookupResult.value instanceof Uint8Array) {
    throw UnknownError.fromCode(new HashTreeDecodeErrorCode('Invalid node tree'));
  }

  // The forks are all labeled trees with the <node_id> label
  const nodeForks = flatten_forks(subnetLookupResult.value) as Array<LabeledHashTree>;
  const nodeKeys = new Map<string, DerEncodedPublicKey>();

  nodeForks.forEach(fork => {
    const node_id = Principal.from(new Uint8Array(fork[1])).toText();
    const publicKeyLookupResult = lookup_path(['public_key'], fork[2]);
    if (publicKeyLookupResult.status !== LookupPathStatus.Found) {
      throw ProtocolError.fromCode(
        new LookupErrorCode('Public key not found', publicKeyLookupResult.status),
      );
    }

    const derEncodedPublicKey = publicKeyLookupResult.value;
    if (derEncodedPublicKey.byteLength !== 44) {
      throw ProtocolError.fromCode(
        new DerKeyLengthMismatchErrorCode(44, derEncodedPublicKey.byteLength),
      );
    } else {
      nodeKeys.set(node_id, derEncodedPublicKey as DerEncodedPublicKey);
    }
  });

  return {
    subnetId: Principal.fromUint8Array(new Uint8Array(delegation.subnet_id)).toText(),
    nodeKeys,
  };
};

export const encodePath = (path: Path, canisterId: Principal): Uint8Array[] => {
  const canisterUint8Array = canisterId.toUint8Array();
  switch (path) {
    case 'time':
      return [strToUtf8('time')];
    case 'controllers':
      return [strToUtf8('canister'), canisterUint8Array, strToUtf8('controllers')];
    case 'module_hash':
      return [strToUtf8('canister'), canisterUint8Array, strToUtf8('module_hash')];
    case 'subnet':
      return [strToUtf8('subnet')];
    case 'candid':
      return [
        strToUtf8('canister'),
        canisterUint8Array,
        strToUtf8('metadata'),
        strToUtf8('candid:service'),
      ];
    default: {
      // Check for CustomPath signature
      if ('key' in path && 'path' in path) {
        // For simplified metadata queries
        if (typeof path['path'] === 'string' || path['path'] instanceof Uint8Array) {
          const metaPath = path.path;
          const encoded = typeof metaPath === 'string' ? strToUtf8(metaPath) : metaPath;

          return [strToUtf8('canister'), canisterUint8Array, strToUtf8('metadata'), encoded];

          // For non-metadata, return the provided custompath
        } else {
          return path['path'];
        }
      }
    }
  }
  throw UnknownError.fromCode(
    new UnexpectedErrorCode(
      `Error while encoding your path for canister status. Please ensure that your path ${path} was formatted correctly.`,
    ),
  );
};

// Controllers are CBOR-encoded buffers
const decodeControllers = (buf: Uint8Array): Principal[] => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const controllersRaw: ArrayBuffer[] = Cbor.decode(buf);
  return controllersRaw.map((buf: ArrayBuffer) => {
    return Principal.fromUint8Array(new Uint8Array(buf));
  });
};
