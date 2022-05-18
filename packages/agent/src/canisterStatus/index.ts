import { lebDecode, PipeArrayBuffer } from '@dfinity/candid';
import { Principal } from '@dfinity/principal';
import { toHex } from '../../src/utils/buffer';
import { Cbor, Certificate } from '..';
import { HttpAgent, HttpAgentOptions } from '..';

type StatusTime = Date;
type StatusControllers = Principal[];
type StatusText = string;

type StatusCustom = string | ArrayBuffer | ArrayBuffer[] | bigint;

/**
 * Types of an entry on the canisterStatus map.
 * An entry of null indicates that the request failed, due to lack of permissions or the result being missing.
 */
export type Status = StatusTime | StatusControllers | StatusText | StatusCustom | null;

export interface CustomPath {
  key: string;
  path: ArrayBuffer[];
  decodeStrategy: 'cbor' | 'hex' | 'leb128' | 'raw';
}
export interface MetaData {
  kind: 'medadata';
  key: string;
  path: string | ArrayBuffer;
  decodeStrategy: 'cbor' | 'hex' | 'leb128' | 'raw';
}

export type Path =
  | 'Time'
  | 'Controllers'
  | 'Subnet'
  | 'ModuleHash'
  | 'Candid'
  | MetaData
  | CustomPath;
export type PathSet = Set<Path>;

export type CanisterStatus = Map<Path | string, Status>;

export type CanisterStatusOptions = {
  canisterId: Principal;
  paths?: Path[] | Set<Path>;
  agentOptions?: HttpAgentOptions;
  agent?: HttpAgent;
};

/**
 *
 * @param {CanisterStatusOptions} options {@link CanisterStatusOptions}
 * @returns {CanisterStatus} object populated with data from the requested paths
 */
export const canisterStatus = async (options: CanisterStatusOptions): Promise<CanisterStatus> => {
  const { canisterId, agentOptions, agent, paths } = options;

  const uniquePaths = [...new Set(paths)];

  // Set up agent
  const effectiveAgent = agent ?? new HttpAgent(agentOptions);
  if (options.agentOptions?.host && !options.agentOptions.host.startsWith('https://ic0.app')) {
    await effectiveAgent.fetchRootKey();
  }

  // Map path options to their correct formats
  const encodedPaths = uniquePaths.map(path => {
    return encodePath(path, canisterId);
  });
  const status = new Map<string | Path, Status>();

  const promises = uniquePaths.map((path, index) => {
    return (async () => {
      try {
        const response = await effectiveAgent.readState(canisterId, {
          paths: [encodedPaths[index]],
        });
        const cert = new Certificate(response, effectiveAgent);
        const verified = await cert.verify();
        if (!verified) {
          throw new Error(
            'There was a problem certifying the response data. Please verify your connection to the mainnet, or be sure to call fetchRootKey on your agent if you are developing locally',
          );
        }

        const data = cert.lookup(encodePath(uniquePaths[index], canisterId));
        data;
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
            case 'Time': {
              status.set(path, decodeTime(data));
              break;
            }
            case 'Controllers': {
              status.set(path, decodeControllers(data));
              break;
            }
            case 'ModuleHash': {
              status.set(path, decodeHex(data));
              break;
            }
            // case 'Subnet': {
            //   status.set(path, decodeModuleHash(data));
            // }
            case 'Candid': {
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
                }
              }
            }
          }
        }
      } catch (error) {
        error;
        if (typeof path !== 'string' && 'key' in path && 'path' in path) {
          status.set(path.key, null);
        } else {
          status.set(path, null);
        }
        console.warn(`Expected to find result for path ${path}, but instead found nothing.`);
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
    case 'Time':
      return [encode('time')];
    case 'Controllers':
      return [encode('canister'), canisterBuffer, encode('controllers')];
    case 'ModuleHash':
      return [encode('canister'), canisterBuffer, encode('module_hash')];
    case 'Subnet':
      return [encode('subnet')];
    case 'Candid':
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

const decodeHex = (buf: ArrayBuffer): StatusText => {
  return toHex(buf);
};

const decodeLeb128 = (buf: ArrayBuffer): bigint => {
  return lebDecode(new PipeArrayBuffer(buf));
};

const decodeCbor = (buf: ArrayBuffer): ArrayBuffer[] => {
  return Cbor.decode(buf);
};

// Time is a CBOR-encoded Nat
const decodeTime = (buf: ArrayBuffer): StatusTime => {
  const decoded = decodeLeb128(buf);
  return new Date(Number(decoded / BigInt(1_000_000)));
};

// Controllers are CBOR-encoded buffers, starting with a Tag we don't need
const decodeControllers = (buf: ArrayBuffer): StatusControllers => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [tag, ...controllersRaw] = decodeCbor(buf);
  return controllersRaw.map((buf: ArrayBuffer) => {
    return Principal.fromUint8Array(new Uint8Array(buf));
  });
};
