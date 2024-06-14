import {
  Actor,
  AnonymousIdentity,
  HttpAgent,
  Identity,
  CanisterStatus,
  getManagementCanister,
  fromHex,
  polling,
} from '@dfinity/agent';
import { IDL } from '@dfinity/candid';
import { Ed25519KeyIdentity } from '@dfinity/identity';
import { Principal } from '@dfinity/principal';
import { describe, it, expect, vi, test } from 'vitest';
import { makeAgent } from '../utils/agent';

const { defaultStrategy, pollForResponse } = polling;

const createWhoamiActor = async (identity: Identity) => {
  const canisterId = 'ivcos-eqaaa-aaaab-qablq-cai';
  const idlFactory = () => {
    return IDL.Service({
      whoami: IDL.Func([], [IDL.Principal], ['query']),
    });
  };
  vi.useFakeTimers();
  new Date(Date.now());

  const agent = await makeAgent({ host: 'https://icp-api.io', identity });

  return Actor.createActor(idlFactory, {
    agent,
    canisterId,
  });
};

describe('certified query', () => {
  it('should verify a query certificate', async () => {
    const actor = await createWhoamiActor(new AnonymousIdentity());
    const result = await actor.whoami();
    expect(Principal.from(result)).toBeInstanceOf(Principal);
  }, 10_000);
  it('should verify lots of query certificates', async () => {
    let count = 1;
    const identities = Array.from({ length: 20 }).map(() => {
      const newIdentity = Ed25519KeyIdentity.generate(new Uint8Array(32).fill(count));
      count++;
      return newIdentity;
    });
    const actors = await identities.map(async identity => await createWhoamiActor(identity));

    const promises = actors.map(async actor => (await actor).whoami());

    const results = await Promise.all(promises);
    results.forEach(result => {
      expect(Principal.from(result)).toBeInstanceOf(Principal);
    });
    expect(results.length).toBe(20);

    expect(results).toMatchInlineSnapshot(`
      [
        {
          "__principal__": "wf3fv-4c4nr-7ks2b-xa4u7-kf3no-32glf-lf7e4-4ng4a-wwtlu-a2vnq-nae",
        },
        {
          "__principal__": "52mr2-fw2ng-2ofst-7jekz-xbymo-3ysz7-itwdk-bgstz-r7g4g-oz5vi-pqe",
        },
        {
          "__principal__": "skpwg-42fe4-eyep5-nfyz7-66wvg-hthea-q3eek-vonbv-5wpxs-nxhmh-fqe",
        },
        {
          "__principal__": "ghaya-cncjm-ntxgt-af5pp-6hzsz-tvwlv-hrlfc-ocq3t-ai7vk-vyixr-cqe",
        },
        {
          "__principal__": "ebtho-zkeqd-ebs74-f5if3-lk6js-3a5q5-37xt4-3ylns-h7r4n-tkhly-aqe",
        },
        {
          "__principal__": "5zqn5-627q2-spx2w-mt6bm-llsnz-gipvv-5femn-3box4-vzuh6-bn723-sae",
        },
        {
          "__principal__": "tek7g-2zmny-nzjwg-ansf7-rkxv6-z32x6-3flbb-ous5d-pygjx-wkhlc-jae",
        },
        {
          "__principal__": "jjn6g-sh75l-r3cxb-wxrkl-frqld-6p6qq-d4ato-wske5-op7s5-n566f-bqe",
        },
        {
          "__principal__": "447dk-byguq-fqkfn-7h4r6-lpk74-itbnh-mkutj-m6tmy-igaff-hmfel-cqe",
        },
        {
          "__principal__": "muo3f-ines5-bxbwm-6wi5e-z663m-3zte2-r7d4x-pleey-xqvxt-scwc5-jae",
        },
        {
          "__principal__": "snzff-yj2qd-fjns7-lqhvw-rsgq7-tohk2-fjnw4-uq3d6-wtk56-pxgry-mqe",
        },
        {
          "__principal__": "pb54o-aqais-24v7j-msopl-bqeuv-paefp-vuoqc-gkezk-grujb-oetl6-sae",
        },
        {
          "__principal__": "bf37n-7ybos-wmqt6-yiov5-24q4m-ajpjk-madkr-snuj2-ngruk-tspnh-aqe",
        },
        {
          "__principal__": "tbjmy-vay5e-hqvv6-sval4-zfxmm-aii6f-b7p55-hwtz5-dejtl-qcuh2-aqe",
        },
        {
          "__principal__": "7d3pe-dh4ov-fp5xz-nctjc-5rduh-gzv3t-5ioyh-4dvx3-x4lgj-hz63t-dqe",
        },
        {
          "__principal__": "37axv-sazcg-75pi3-owhxr-kollq-xnzjz-zfxsv-nzdbp-yaelp-shcul-jae",
        },
        {
          "__principal__": "r772c-4dz5f-rpg4e-qzxgg-7bxlb-67zpu-bitgb-vsx7k-mmagd-6zk3d-4qe",
        },
        {
          "__principal__": "knkon-d3kx7-du4wt-r2fo6-uwc5a-hwhkk-m7snf-nxfhu-6bhgb-k6dn5-wae",
        },
        {
          "__principal__": "entn3-mas6a-37smu-vadtg-wgsno-zokif-vyphu-umase-lfwqe-dmcrk-kae",
        },
        {
          "__principal__": "hy3bf-xpwhn-ru6bb-lhqol-wrjew-j2xqi-gb4gb-muivw-d6bkg-q3tp4-lqe",
        },
      ]
    `);
  });
});

describe('controllers', () => {
  it('should return the controllers of a canister with multiple controllers', async () => {
    const agent = new HttpAgent({ host: 'https://icp-api.io' });
    const status = await CanisterStatus.request({
      // Whoami canister
      canisterId: Principal.from('ivcos-eqaaa-aaaab-qablq-cai'),
      agent: agent,
      paths: ['controllers'],
    });
    expect((status.get('controllers') as Principal[]).map(p => p.toText())).toMatchInlineSnapshot(`
    [
      "hgfyw-myaaa-aaaab-qaaoa-cai",
      "b73qn-rqaaa-aaaap-aazvq-cai",
      "5vdms-kaaaa-aaaap-aa3uq-cai",
      "aux4w-bi6yf-a3bhr-zydhx-qvf2p-ymdeg-ddvg6-gmobi-ct4dk-wf4xd-nae",
      "jhnlf-yu2dz-v7beb-c77gl-76tj7-shaqo-5qfvi-htvel-gzamb-bvzx6-yqe",
    ]
  `);
  });
  it('should return the controllers of a canister with one controller', async () => {
    const agent = new HttpAgent({ host: 'https://icp-api.io' });
    const status = await CanisterStatus.request({
      // NNS Governance Canister
      canisterId: Principal.from('rrkah-fqaaa-aaaaa-aaaaq-cai'),
      agent: agent,
      paths: ['controllers'],
    });
    // Should be root canister
    expect((status.get('controllers') as Principal[]).map(p => p.toText())).toMatchInlineSnapshot(`
    [
      "r7inp-6aaaa-aaaaa-aaabq-cai",
    ]
  `);
  });
  it('should return the controllers of a canister with no controllers', async () => {
    const agent = new HttpAgent({ host: 'https://icp-api.io' });
    const status = await CanisterStatus.request({
      // nomeata's capture-the-ic-token canister
      canisterId: Principal.from('fj6bh-taaaa-aaaab-qaacq-cai'),
      agent: agent,
      paths: ['controllers'],
    });
    expect((status.get('controllers') as Principal[]).map(p => p.toText())).toMatchInlineSnapshot(`
    []
  `);
  });
});

describe('bitcoin query', async () => {
  it('should return the balance of a bitcoin address', async () => {
    // TODO - verify node signature for bitcoin once supported
    const agent = await makeAgent({ host: 'https://icp-api.io', verifyQuerySignatures: false });
    const management = getManagementCanister({
      agent,
    });

    const result = await management.bitcoin_get_balance_query({
      address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
      network: { mainnet: null },
      min_confirmations: [6],
    });
    console.log(`balance for address: ${result}`);
    expect(result).toBeGreaterThan(0n);
  });
  it('should handle call forwarding', async () => {
    vi.useRealTimers();
    const forwardedOptions = {
      canisterId: 'tnnnb-2yaaa-aaaab-qaiiq-cai',
      methodName: 'inc_read',
      arg: '4449444c0000',
      effectiveCanisterId: 'tnnnb-2yaaa-aaaab-qaiiq-cai',
    };

    const agent = new HttpAgent({ host: 'https://icp-api.io' });
    const { requestId } = await agent.call(Principal.fromText(forwardedOptions.canisterId), {
      methodName: forwardedOptions.methodName,
      arg: fromHex(forwardedOptions.arg),
      effectiveCanisterId: Principal.fromText(forwardedOptions.effectiveCanisterId),
    });

    const { certificate, reply } = await pollForResponse(
      agent,
      Principal.fromText(forwardedOptions.effectiveCanisterId),
      requestId,
      defaultStrategy(),
    );
    certificate; // Certificate
    reply; // ArrayBuffer
  }, 15_000);
});

