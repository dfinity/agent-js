import { lebDecode, PipeArrayBuffer } from '@dfinity/candid';
import { Principal } from '@dfinity/principal';
import { toHex } from '../../src/utils/buffer';
import { Cbor, Certificate } from '..';
import { HttpAgent, HttpAgentOptions } from '..';
import assert from 'assert';

type StatusTime = Date;
type StatusControllers = Principal[];
type StatusModuleHash = string;
type StatusCandid = string;
type Status = StatusTime | StatusControllers | StatusModuleHash | StatusCandid;

type CustomPath = ArrayBuffer[][];
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

type CanisterStatus = Map<Path, Status>;

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
  const status = new Map<Path, Status>();

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
              status.set(path, decodeModuleHash(data));
              break;
            }
            // case 'Subnet': {
            //   status.set(path, decodeModuleHash(data));
            // }
            case 'Candid': {
              status.set(path, decodeCandid(data));
              break;
            }
            default: {
              path;
              assert(path);
            }
          }
        }
      } catch (error) {
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
  }
};

// Time is a CBOR-encoded Nat
const decodeTime = (buf: ArrayBuffer): StatusTime => {
  const decoded = lebDecode(new PipeArrayBuffer(buf));
  return new Date(Number(decoded / BigInt(1000)));
};

// Controllers are CBOR-encoded buffers, starting with a Tag we don't need
const decodeControllers = (buf: ArrayBuffer): StatusControllers => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [tag, ...controllersRaw] = Cbor.decode(buf);
  return controllersRaw.map((buf: ArrayBuffer) => {
    return Principal.fromUint8Array(new Uint8Array(buf));
  });
};

// The hash is a straightforward hash
const decodeModuleHash = (buf: ArrayBuffer): StatusModuleHash => {
  return toHex(buf);
};

const decodeCandid = (buf: ArrayBuffer): StatusCandid => {
  return new TextDecoder().decode(buf);
};
