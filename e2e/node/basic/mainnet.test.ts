import { Actor, AnonymousIdentity, HttpAgent, Identity } from '@dfinity/agent';
import { IDL } from '@dfinity/candid';
import { Ed25519KeyIdentity } from '@dfinity/identity';
import { Principal } from '@dfinity/principal';

const createWhoamiActor = (identity: Identity) => {
  const canisterId = 'ivcos-eqaaa-aaaab-qablq-cai';
  const idlFactory = () => {
    return IDL.Service({
      whoami: IDL.Func([], [IDL.Principal], ['query']),
    });
  };
  jest.useFakeTimers();
  new Date(Date.now());

  const agent = new HttpAgent({ host: 'https://icp-api.io', fetch: fetch, identity });

  return Actor.createActor(idlFactory, {
    agent,
    canisterId,
  });
};

describe('certified query', () => {
  it('should verify a query certificate', async () => {
    const actor = createWhoamiActor(new AnonymousIdentity());

    const result = await actor.whoami();

    expect(result).toBeInstanceOf(Principal);
  });
  jest.setTimeout(100_000);
  it('should verify lots of query certificates', async () => {
    let count = 0;
    const identities = Array.from({ length: 20 }).map(() => {
      const newIdentity = Ed25519KeyIdentity.generate(new Uint8Array(32).fill(count));
      count++;
      return newIdentity;
    });
    const actors = identities.map(createWhoamiActor);
    const promises = actors.map(actor => actor.whoami());

    const results = await Promise.all(promises);
    results.forEach(result => {
      expect(result).toBeInstanceOf(Principal);
    });
    expect(results.length).toBe(20);

    expect(results).toMatchInlineSnapshot(`
      Array [
        Object {
          "__principal__": "535yc-uxytb-gfk7h-tny7p-vjkoe-i4krp-3qmcl-uqfgr-cpgej-yqtjq-rqe",
        },
        Object {
          "__principal__": "wf3fv-4c4nr-7ks2b-xa4u7-kf3no-32glf-lf7e4-4ng4a-wwtlu-a2vnq-nae",
        },
        Object {
          "__principal__": "52mr2-fw2ng-2ofst-7jekz-xbymo-3ysz7-itwdk-bgstz-r7g4g-oz5vi-pqe",
        },
        Object {
          "__principal__": "skpwg-42fe4-eyep5-nfyz7-66wvg-hthea-q3eek-vonbv-5wpxs-nxhmh-fqe",
        },
        Object {
          "__principal__": "ghaya-cncjm-ntxgt-af5pp-6hzsz-tvwlv-hrlfc-ocq3t-ai7vk-vyixr-cqe",
        },
        Object {
          "__principal__": "ebtho-zkeqd-ebs74-f5if3-lk6js-3a5q5-37xt4-3ylns-h7r4n-tkhly-aqe",
        },
        Object {
          "__principal__": "5zqn5-627q2-spx2w-mt6bm-llsnz-gipvv-5femn-3box4-vzuh6-bn723-sae",
        },
        Object {
          "__principal__": "tek7g-2zmny-nzjwg-ansf7-rkxv6-z32x6-3flbb-ous5d-pygjx-wkhlc-jae",
        },
        Object {
          "__principal__": "jjn6g-sh75l-r3cxb-wxrkl-frqld-6p6qq-d4ato-wske5-op7s5-n566f-bqe",
        },
        Object {
          "__principal__": "447dk-byguq-fqkfn-7h4r6-lpk74-itbnh-mkutj-m6tmy-igaff-hmfel-cqe",
        },
        Object {
          "__principal__": "muo3f-ines5-bxbwm-6wi5e-z663m-3zte2-r7d4x-pleey-xqvxt-scwc5-jae",
        },
        Object {
          "__principal__": "snzff-yj2qd-fjns7-lqhvw-rsgq7-tohk2-fjnw4-uq3d6-wtk56-pxgry-mqe",
        },
        Object {
          "__principal__": "pb54o-aqais-24v7j-msopl-bqeuv-paefp-vuoqc-gkezk-grujb-oetl6-sae",
        },
        Object {
          "__principal__": "bf37n-7ybos-wmqt6-yiov5-24q4m-ajpjk-madkr-snuj2-ngruk-tspnh-aqe",
        },
        Object {
          "__principal__": "tbjmy-vay5e-hqvv6-sval4-zfxmm-aii6f-b7p55-hwtz5-dejtl-qcuh2-aqe",
        },
        Object {
          "__principal__": "7d3pe-dh4ov-fp5xz-nctjc-5rduh-gzv3t-5ioyh-4dvx3-x4lgj-hz63t-dqe",
        },
        Object {
          "__principal__": "37axv-sazcg-75pi3-owhxr-kollq-xnzjz-zfxsv-nzdbp-yaelp-shcul-jae",
        },
        Object {
          "__principal__": "r772c-4dz5f-rpg4e-qzxgg-7bxlb-67zpu-bitgb-vsx7k-mmagd-6zk3d-4qe",
        },
        Object {
          "__principal__": "knkon-d3kx7-du4wt-r2fo6-uwc5a-hwhkk-m7snf-nxfhu-6bhgb-k6dn5-wae",
        },
        Object {
          "__principal__": "entn3-mas6a-37smu-vadtg-wgsno-zokif-vyphu-umase-lfwqe-dmcrk-kae",
        },
      ]
    `);
  });
});
