/** @module CanisterStatus */

import { lebDecode, PipeArrayBuffer } from '@dfinity/candid';
import { Principal } from '@dfinity/principal';
import { AgentError } from '../errors';
import { HttpAgent } from '../agent/http';
import { Certificate, CreateCertificateOptions } from '../certificate';
import { toHex } from '../utils/buffer';
import * as Cbor from '../cbor';

/**
 * Types of an entry on the canisterStatus map.
 * An entry of null indicates that the request failed, due to lack of permissions or the result being missing.
 */
export type Status = string | ArrayBuffer | Date | ArrayBuffer[] | Principal[] | bigint | null;

/**
 * Interface to define a custom path. Nested paths will be represented as individual buffers, and can be created from text using {@link TextEncoder}
 */
export interface CustomPath {
  key: string;
  path: ArrayBuffer[] | string;
  decodeStrategy: 'cbor' | 'hex' | 'leb128' | 'utf-8' | 'raw';
}

/**
 * Interface to request metadata from the icp:public or icp:private sections.
 * Similar to {@link CustomPath}, but accepts a simple string argument.
 * Private metadata will require the ${@link Identity} used by the ${@link HttpAgent} will need to be requested using an identity that controlls the canister.
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
 *
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
  const { canisterId, agent, paths } = options;

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

        const data = cert.lookup(encodePath(uniquePaths[index], canisterId));
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

const decodeLeb128 = (buf: ArrayBuffer): bigint => {
  return lebDecode(new PipeArrayBuffer(buf));
};

const decodeCbor = (buf: ArrayBuffer): ArrayBuffer[] => {
  return Cbor.decode(buf);
};

const decodeUtf8 = (buf: ArrayBuffer): string => {
  return new TextDecoder().decode(buf);
};

// time is a LEB128-encoded Nat
const decodeTime = (buf: ArrayBuffer): Date => {
  const decoded = decodeLeb128(buf);
  return new Date(Number(decoded / BigInt(1_000_000)));
};

// Controllers are CBOR-encoded buffers, starting with a Tag we don't need
const decodeControllers = (buf: ArrayBuffer): Principal[] => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [tag, ...controllersRaw] = decodeCbor(buf);
  return controllersRaw.map((buf: ArrayBuffer) => {
    return Principal.fromUint8Array(new Uint8Array(buf));
  });
};
