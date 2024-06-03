/** @module CanisterStatus */
import { Principal } from '@dfinity/principal';
import { AgentError } from '../errors';
import { HttpAgent } from '../agent/http';
import {
  Cert,
  Certificate,
  CreateCertificateOptions,
  HashTree,
  flatten_forks,
  check_canister_ranges,
  LookupStatus,
  lookup_path,
  lookupResultToBuffer,
} from '../certificate';
import { toHex } from '../utils/buffer';
import * as Cbor from '../cbor';
import { decodeLeb128, decodeTime } from '../utils/leb';
import { DerEncodedPublicKey } from '..';

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
  | ArrayBuffer
  | Date
  | ArrayBuffer[]
  | Principal[]
  | SubnetStatus
  | bigint
  | null;

/**
 * Interface to define a custom path. Nested paths will be represented as individual buffers, and can be created from text using TextEncoder.
 * @param {string} key the key to use to access the returned value in the canisterStatus map
 * @param {ArrayBuffer[]} path the path to the desired value, represented as an array of buffers
 * @param {string} decodeStrategy the strategy to use to decode the returned value
 */
export class CustomPath implements CustomPath {
  public key: string;
  public path: ArrayBuffer[] | string;
  public decodeStrategy: 'cbor' | 'hex' | 'leb128' | 'utf-8' | 'raw';
  constructor(
    key: string,
    path: ArrayBuffer[] | string,
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
  path: string | ArrayBuffer;
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
        const cert = await Certificate.create({
          certificate: response.certificate,
          rootKey: agent.rootKey,
          canisterId: canisterId,
        });

        const lookup = (cert: Certificate, path: Path) => {
          if (path === 'subnet') {
            const data = fetchNodeKeys(response.certificate, canisterId, agent.rootKey);
            return {
              path: path,
              data,
            };
          } else {
            return {
              path: path,
              data: lookupResultToBuffer(cert.lookup(encodePath(path, canisterId))),
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
              status.set(path, decodeHex(data));
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
                    status.set(path.key, decodeCbor(data));
                    break;
                  }
                  case 'hex': {
                    status.set(path.key, decodeHex(data));
                    break;
                  }
                  case 'utf-8': {
                    status.set(path.key, decodeUtf8(data));
                  }
                }
              }
            }
          }
        }
      } catch (error) {
        // Break on signature verification errors
        if ((error as AgentError)?.message?.includes('Invalid certificate')) {
          throw new AgentError((error as AgentError).message);
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
  certificate: ArrayBuffer,
  canisterId: Principal,
  root_key?: ArrayBuffer | Uint8Array,
): SubnetStatus => {
  if (!canisterId._isPrincipal) {
    throw new Error('Invalid canisterId');
  }
  const cert = Cbor.decode(new Uint8Array(certificate)) as Cert;
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
      certificate: new ArrayBuffer(0),
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
      certificate: new ArrayBuffer(0),
    };
  }

  const canisterInRange = check_canister_ranges({ canisterId, subnetId, tree });
  if (!canisterInRange) {
    throw new Error('Canister not in range');
  }

  const subnetLookupResult = lookup_path(['subnet', delegation.subnet_id, 'node'], tree);
  if (subnetLookupResult.status !== LookupStatus.Found) {
    throw new Error('Node not found');
  }
  if (subnetLookupResult.value instanceof ArrayBuffer) {
    throw new Error('Invalid node tree');
  }

  const nodeForks = flatten_forks(subnetLookupResult.value);
  const nodeKeys = new Map<string, DerEncodedPublicKey>();

  nodeForks.forEach(fork => {
    const node_id = Principal.from(new Uint8Array(fork[1] as ArrayBuffer)).toText();
    const publicKeyLookupResult = lookup_path(['public_key'], fork[2] as HashTree);
    if (publicKeyLookupResult.status !== LookupStatus.Found) {
      throw new Error('Public key not found');
    }

    const derEncodedPublicKey = publicKeyLookupResult.value as ArrayBuffer;
    if (derEncodedPublicKey.byteLength !== 44) {
      throw new Error('Invalid public key length');
    } else {
      nodeKeys.set(node_id, derEncodedPublicKey as DerEncodedPublicKey);
    }
  });

  return {
    subnetId: Principal.fromUint8Array(new Uint8Array(delegation.subnet_id)).toText(),
    nodeKeys,
  };
};

export const encodePath = (path: Path, canisterId: Principal): ArrayBuffer[] => {
  const encoder = new TextEncoder();

  const encode = (arg: string): ArrayBuffer => {
    return new DataView(encoder.encode(arg).buffer).buffer;
  };
  const canisterBuffer = new DataView(canisterId.toUint8Array().buffer).buffer;
  switch (path) {
    case 'time':
      return [encode('time')];
    case 'controllers':
      return [encode('canister'), canisterBuffer, encode('controllers')];
    case 'module_hash':
      return [encode('canister'), canisterBuffer, encode('module_hash')];
    case 'subnet':
      return [encode('subnet')];
    case 'candid':
      return [encode('canister'), canisterBuffer, encode('metadata'), encode('candid:service')];
    default: {
      // Check for CustomPath signature
      if ('key' in path && 'path' in path) {
        // For simplified metadata queries
        if (typeof path['path'] === 'string' || path['path'] instanceof ArrayBuffer) {
          const metaPath = path.path;
          const encoded = typeof metaPath === 'string' ? encode(metaPath) : metaPath;

          return [encode('canister'), canisterBuffer, encode('metadata'), encoded];

          // For non-metadata, return the provided custompath
        } else {
          return path['path'];
        }
      }
    }
  }
  throw new Error(
    `An unexpeected error was encountered while encoding your path for canister status. Please ensure that your path, ${path} was formatted correctly.`,
  );
};

const decodeHex = (buf: ArrayBuffer): string => {
  return toHex(buf);
};

const decodeCbor = (buf: ArrayBuffer): ArrayBuffer[] => {
  return Cbor.decode(buf);
};

const decodeUtf8 = (buf: ArrayBuffer): string => {
  return new TextDecoder().decode(buf);
};

// Controllers are CBOR-encoded buffers
const decodeControllers = (buf: ArrayBuffer): Principal[] => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const controllersRaw = decodeCbor(buf);
  return controllersRaw.map((buf: ArrayBuffer) => {
    return Principal.fromUint8Array(new Uint8Array(buf));
  });
};
