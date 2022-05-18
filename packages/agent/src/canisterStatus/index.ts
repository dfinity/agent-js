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

type CustomPath = {
  key: string;
  path: ArrayBuffer[];
  decodeStrategy: 'cbor' | 'hex' | 'leb128' | 'raw';
};
type MetaData = {
  type: 'public' | 'private';
};
export type Path =
  | 'Time'
  | 'Controllers'
  | 'Subnet'
  | 'ModuleHash'
  | 'Candid'
  | MetaData
  | CustomPath;
export type PathSet = Set<Path>;

type CanisterStatus = Map<Path | string, Status>;

/**
 *
 * @param {Principal} canisterId canister to check the status of
 * @param {Set<Path>} paths - a Set of {@link Path} to request from the replica
 * @param {HttpAgentOptions | undefined} agentOptions - options for the httpAgent to be used - i.e. identity, host, or fetch implementation
 * @returns {CanisterStatus} object populated with data from the requested paths
 */
type CanisterStatusOptions = {
  canisterId: Principal;
  paths?: Path[] | Set<Path>;
  agentOptions?: HttpAgentOptions;
};

export const canisterStatus = async (options: CanisterStatusOptions): Promise<CanisterStatus> => {
  const { canisterId, agentOptions, paths } = options ?? {};

  const uniquePaths = [...new Set(paths)];

  // Set up agent
  const agent = new HttpAgent(agentOptions);
  if (options.agentOptions?.host && !options.agentOptions.host.startsWith('https://ic0.app')) {
    await agent.fetchRootKey();
  }

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

        const cert = new Certificate(response, agent);
        const verified = await cert.verify();
        if (!verified) {
          throw new Error(
            'There was a problem certifying the response data. Please verify your connection to the mainnet',
          );
        }

        encodePath(uniquePaths[index], canisterId); //?

        const data = cert.lookup(encodePath(uniquePaths[index], canisterId));

        if (!data) {
          console.warn(`Expected to find result for path ${path}, but instead found nothing.`);
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
              status.set(path, decodeHex(data));
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
        console.error(`Expected to find result for path ${path}, but instead found nothing.`);
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
        return path['path'];
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
  return new Date(Number(decoded / BigInt(1000)));
};

// Controllers are CBOR-encoded buffers, starting with a Tag we don't need
const decodeControllers = (buf: ArrayBuffer): StatusControllers => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [tag, ...controllersRaw] = decodeCbor(buf);
  return controllersRaw.map((buf: ArrayBuffer) => {
    return Principal.fromUint8Array(new Uint8Array(buf));
  });
};
