import { request, Path, encodePath, fetchNodeKeys } from './index';
import { Ed25519KeyIdentity } from '@dfinity/identity';
import { Principal } from '@dfinity/principal';
import { fromHexString } from '@dfinity/candid';
import { Identity } from '../auth';
import fetch from 'isomorphic-fetch';
import { HttpAgent } from '../agent';
import { fromHex, toHex } from '../utils/buffer';
import * as Cert from '../certificate';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { goldenCertificates } from '../agent/http/__certificates__/goldenCertificates';

const IC_ROOT_KEY =
  '308182301d060d2b0601040182dc7c0503010201060c2b0601040182dc7c05030201036100814' +
  'c0e6ec71fab583b08bd81373c255c3c371b2e84863c98a4f1e08b74235d14fb5d9c0cd546d968' +
  '5f913a0c0b2cc5341583bf4b4392e467db96d65b9bb4cb717112f8472e0d5a4d14505ffd7484' +
  'b01291091c5f87b98883463f98091a0baaae';
const testPrincipal = Principal.fromText('rrkah-fqaaa-aaaaa-aaaaq-cai');

// bypass bls verification so that an old certificate is accepted
jest.mock('../utils/bls', () => {
  return {
    blsVerify: jest.fn(() => Promise.resolve(true)),
  };
});

jest.useFakeTimers();
const certificateTime = Date.parse('2022-05-19T20:58:22.596Z');
jest.setSystemTime(certificateTime);

// Utils
const encoder = new TextEncoder();
const encode = (arg: string): ArrayBuffer => {
  return new DataView(encoder.encode(arg).buffer).buffer;
};
const canisterBuffer = new DataView(testPrincipal.toUint8Array().buffer).buffer;

/* Produced by deploying a dfx new canister and requesting
  | 'time'
  | 'controllers'
  | 'subnet'
  | 'moduleHash'
  | 'candid'
  in dfx 0.10.0
  */
const testCases = [
  {
    certificate:
      'd9d9f7a2647472656583018301830183024863616e697374657283018301820458204c805d47bd74dbcd6c8ce23ebd2e8287c453895165db6b81d93f1daf1b12004683024a0000000000000001010183018301820458205a1ee5770842c74b6749f4d72e3c1b8c0dafdaff48e113d19da4fda687df0636830183024b636f6e74726f6c6c657273820351d9d9f78241044a000000000000000001018302486d657461646174618301830182045820e8071e9c904063629f9ab66d4a447b7a881a964d16757762f424d2ef6c6a776b83024e63616e6469643a736572766963658203584774797065204578616d706c65203d20746578743b0a73657276696365203a207b0a202067726565743a20284578616d706c6529202d3e202874657874292071756572793b0a7d0a820458203676da3cc701ead8143596204d845c31a11d483dccffd5f80e5530660322212883024b6d6f64756c655f6861736882035820896f6c079f96bc3cbef782af1ab1b52847f04700ff916eb49425566995a9a064820458202d41b194a0931a274d874a4de945f104fbcf45de1bb201ec2bbdcb036c21fb0f82045820aa2f527164a8e4d898febf2bc0a8a4f95da58c3b62c6e4185e610e7b40dc615082045820fa572fdf7872444dba23377a8a426906c4314a61ef470df0af1b173b13abe949830182045820ec68f8bfb2a3f70cf8d3d427ff595e6ddb5d4230a8c3ca1d3ccb06e7694fd83283024474696d6582034980f485e1a4a6a7f816697369676e61747572655830adbb57f847e2656f248d3eec467af3c89eb5c63fa8d56bd3a3f48e3f3c570e50d0f824502fc69772d0d637190c52e4e4',
  },
];

// Used for repopulating the certificate
const getRealStatus = async () => {
  const identity = (await Ed25519KeyIdentity.generate(
    new Uint8Array(
      fromHexString('foo23342sd-234-234a-asdf-asdf-asdf-4frsefrsdf-weafasdfe-easdfee'),
    ),
  )) as unknown as Identity;

  const agent = new HttpAgent({ host: 'http://127.0.0.1:4943', fetch, identity });
  await agent.fetchRootKey();
  const canisterBuffer = new DataView(testPrincipal.toUint8Array().buffer).buffer;
  canisterBuffer;
  const response = await agent.readState(
    testPrincipal,
    // Note: subnet is not currently working due to a bug
    {
      paths: [
        encodePath('time', testPrincipal),
        [encode('canister'), canisterBuffer, encode('controllers')],
        [encode('canister'), canisterBuffer, encode('module_hash')],
        encodePath('candid', testPrincipal),
      ],
    },
    identity,
  );
  console.log(toHex(response.certificate));
};

// Mocked status using precomputed certificate
const getStatus = async (paths: Path[]) => {
  const agent = new HttpAgent({ host: 'https://ic0.app' });
  agent.readState = jest.fn(() =>
    Promise.resolve({ certificate: fromHex(testCases[0].certificate) }),
  );

  return await request({
    canisterId: testPrincipal,
    // Note: subnet is not currently working due to a bug
    paths,
    agent,
  });
};

describe('Canister Status utility', () => {
  it('should query the time', async () => {
    const status = await getStatus(['time']);
    expect(status.get('time')).toMatchSnapshot();
  });
  it('should query canister controllers', async () => {
    const status = await getStatus(['controllers']);
    expect(status.get('controllers')).toMatchSnapshot();
  });
  it('should query canister module hash', async () => {
    const status = await getStatus(['module_hash']);
    expect(status.get('module_hash')).toMatchSnapshot();
  });
  it('should query the candid interface', async () => {
    const status = await getStatus(['candid']);
    expect(status.get('candid')).toMatchSnapshot();
  });
  it('should support valid custom paths', async () => {
    const status = await getStatus([
      {
        key: 'time',
        path: [new DataView(new TextEncoder().encode('time').buffer).buffer],
        decodeStrategy: 'leb128',
      },
    ]);
    const statusRaw = await getStatus([
      {
        key: 'time',
        path: [new DataView(new TextEncoder().encode('time').buffer).buffer],
        decodeStrategy: 'raw',
      },
    ]);
    const statusUTF8 = await getStatus([
      {
        kind: 'metadata',
        path: 'candid:service',
        key: 'candid',
        decodeStrategy: 'utf-8',
      },
    ]);
    const statusHex = await getStatus([
      {
        key: 'time',
        path: [new DataView(new TextEncoder().encode('time').buffer).buffer],
        decodeStrategy: 'hex',
      },
    ]);
    const statusCBOR = await getStatus([
      {
        key: 'Controller',
        path: [encode('canister'), canisterBuffer, encode('controllers')],
        decodeStrategy: 'cbor',
      },
    ]);
    expect(status.get('time')).toMatchSnapshot();
    expect(statusRaw.get('time')).toMatchSnapshot();
    expect(statusUTF8.get('candid')).toMatchSnapshot();
    expect(statusHex.get('time')).toMatchSnapshot();
    expect(statusCBOR.get('Controller')).toMatchSnapshot();
  });
  it('should support valid metadata queries', async () => {
    const status = await getStatus([
      {
        kind: 'metadata',
        path: 'candid:service',
        key: 'candid',
        decodeStrategy: 'hex',
      },
    ]);
    const statusEncoded = await getStatus([
      {
        kind: 'metadata',
        path: encode('candid:service'),
        key: 'candid',
        decodeStrategy: 'hex',
      },
    ]);
    expect(status.get('candid')).toMatchSnapshot();
    expect(statusEncoded.get('candid')).toMatchSnapshot();
  });
  it('should support multiple requests', async () => {
    const status = await getStatus(['time', 'controllers']);
    expect(status.get('time')).toMatchSnapshot();
    expect(status.get('controllers')).toMatchSnapshot();
  });
  it('should support multiple requests with a failure', async () => {
    // Deliberately requesting a bad value
    const consoleSpy = jest.spyOn(console, 'warn');
    const status = await getStatus([
      'time',
      // subnet and this arbitrary path should fail
      'subnet',
      {
        key: 'asdf',
        path: [new DataView(new TextEncoder().encode('asdf').buffer).buffer],
        decodeStrategy: 'hex',
      },
    ]);
    expect(status.get('time')).toMatchSnapshot();
    // Expect null for a failed result
    expect(status.get('asdf' as unknown as Path)).toBe(null);
    // Expect undefined for unset value
    expect(status.get('test123')).toBe(undefined);
    expect(consoleSpy).toBeCalledTimes(3);
  });
});

describe('node keys', () => {
  it('should return the node keys from a mainnet application subnet certificate', async () => {
    const { mainnetApplication } = goldenCertificates;
    jest.useFakeTimers();
    jest.setSystemTime(new Date(Date.parse('2023-09-27T19:38:58.129Z')));
    const cert = await Cert.Certificate.create({
      certificate: fromHex(mainnetApplication),
      canisterId: Principal.fromText('erxue-5aaaa-aaaab-qaagq-cai'),
      rootKey: fromHex(IC_ROOT_KEY),
    });

    const nodeKeys = fetchNodeKeys(fromHex(mainnetApplication), fromHex(IC_ROOT_KEY));
    expect(nodeKeys).toMatchInlineSnapshot(`
      Object {
        "nodeKeys": Map {
          "djil5-54fkt-55svu-26a7h-ttflx-dqn6u-3w3j6-zyuwg-cfwuo-7oi46-uae" => ArrayBuffer [],
          "abiez-tmiok-onixf-alhrk-6ki4c-uquml-fnpvd-zirix-brula-uheyo-5ae" => ArrayBuffer [],
          "m2g5i-bmomq-dyjao-k642i-fsfxg-trxki-6i42q-hm6ec-xu5cd-n5jhq-sqe" => ArrayBuffer [],
          "wj4ul-2uxc6-4zyg7-ubs4e-meno4-2pjfz-3rl2y-ksarb-vlbjx-zrnpy-6qe" => ArrayBuffer [],
          "ul75e-6e3ls-pno2p-y3plc-cd2gq-dfnw4-56woc-s45vm-ipu6u-lotli-uae" => ArrayBuffer [],
          "y6xdi-6nbil-4w6ju-4vqux-wdl5m-uofuq-2hbv4-dels3-knu42-xievh-hae" => ArrayBuffer [],
          "q2gfr-yfiod-ohoo3-czlr4-ghfbs-bp7pr-zefjc-gbpyy-lfg4y-etedq-lqe" => ArrayBuffer [],
          "w2l33-vvva3-qvjdn-2vgqn-qqbif-i6fuy-ekpwi-ksq22-ru4rz-6ycrr-tae" => ArrayBuffer [],
          "5flj4-x56ts-jud7h-rzygl-a7uas-2degg-kyz5e-xojpt-pbuph-34zby-bae" => ArrayBuffer [],
          "7ft3v-76mqt-5r3h4-qiwe4-mkobb-mcsue-qugga-ctzdk-623if-rynkj-jqe" => ArrayBuffer [],
          "kte5g-iwzok-3epfk-lovgf-cylc5-57lmu-olhwg-w4jsn-dquju-5xun6-uae" => ArrayBuffer [],
          "c3clp-pxh3b-ut2t3-dejla-zsfqz-k2cqd-2aygq-zk7pf-cv3is-oqr5k-oqe" => ArrayBuffer [],
          "ucumw-ex6s5-r7nyd-x546u-f4rcl-qllyh-waid4-xxzvn-25op7-gnsjy-bae" => ArrayBuffer [],
        },
        "subnetId": "pae4o-o6dxf-xki7q-ezclx-znyd6-fnk6w-vkv5z-5lfwh-xym2i-otrrw-fqe",
      }
    `);
  });

  it('should return the node keys from a mainnet system subnet certificate', async () => {
    const { mainnetSystem } = goldenCertificates;
    jest.useFakeTimers();
    jest.setSystemTime(new Date(Date.parse('2023-09-27T19:58:19.412Z')));
    const cert = await Cert.Certificate.create({
      certificate: fromHex(mainnetSystem),
      canisterId: Principal.fromText('ryjl3-tyaaa-aaaaa-aaaba-cai'),
      rootKey: fromHex(IC_ROOT_KEY),
    });

    const nodeKeys = fetchNodeKeys(fromHex(mainnetSystem), fromHex(IC_ROOT_KEY));
    expect(nodeKeys).toMatchInlineSnapshot(`
      Object {
        "nodeKeys": Map {
          "ego73-sreyv-vpdjs-gxxxh-jormr-swyro-toj4x-obghz-sbk32-duwid-dae" => ArrayBuffer [],
          "tm3pc-2bjsx-hhv3v-fsrt7-wotdj-nbu3t-ewloq-uporp-tacou-lupdn-oae" => ArrayBuffer [],
          "7pwmx-4zsiq-saplf-kl2sd-4yvr3-la2yi-artrs-m7voc-htak4-fii5y-sqe" => ArrayBuffer [],
          "gj6gc-mbslq-bt63y-72b7h-xs2xw-6vyuj-frvp3-tx375-dsqx5-wem6o-vqe" => ArrayBuffer [],
          "6hkcx-vz4jv-4n33r-ywdvs-sefaa-tb2on-rac6s-4csut-iyahu-zmct2-5qe" => ArrayBuffer [],
          "4j5xx-bj63k-iky3j-xrlt4-pel7s-t6wdq-hgqwz-c6xhn-llihg-wxska-rqe" => ArrayBuffer [],
          "tg4ec-b2g4p-h42kd-k7zvb-6rls2-i2q7l-gtr4h-ymr6v-rrez4-w6fao-oqe" => ArrayBuffer [],
          "swzzz-nct4o-kgh2s-fezeh-luamk-chexm-jsk4r-ks2qa-au63y-jtc7r-pae" => ArrayBuffer [],
          "f3zwq-g3ap2-42acw-twrar-6wire-5uhtr-qyu2e-v7vl7-43e3b-kdz7g-yae" => ArrayBuffer [],
          "lj3ve-ztk3f-wbkmj-garra-gm3kk-f2kas-zq6cw-6url4-ekmls-5vlm5-hae" => ArrayBuffer [],
          "j6uir-h4bk3-chdqr-hxnkr-3jp7o-yb3el-skdsd-7oejj-eubk5-5onvy-zae" => ArrayBuffer [],
          "6hvx2-ymemx-tmykh-vxyic-bgfhv-2lcmt-3oy4x-rysuf-rnerz-vqokw-sqe" => ArrayBuffer [],
          "6oooh-jum6y-focwn-kx5ba-omunf-jksiz-25lqk-xvcvb-7afff-3ceei-nqe" => ArrayBuffer [],
          "5mpdi-v4qj2-64are-tbe6r-6335g-6tksh-c7uzq-w3xyz-o4p5g-rwnll-vqe" => ArrayBuffer [],
          "3xpep-l47ad-vhwcb-gvikf-vpkdj-dbwky-jt5wc-odcdy-b5r4k-fiqbg-7qe" => ArrayBuffer [],
          "3rj6n-nnhqn-nad5q-y262v-fuhk4-myqv2-6qzld-ouk7q-fbsuo-l2fi3-6ae" => ArrayBuffer [],
          "p3g3j-vvhxl-luedm-woh3j-sllez-jkbzz-274bf-hyuoc-kyo5t-kwziw-eae" => ArrayBuffer [],
          "y5xp4-nnr33-qeeeg-55unp-xr7f2-mkjfv-7qwe3-zxd7k-lmqd2-mftya-7ae" => ArrayBuffer [],
          "tetdc-mvyld-p3miw-jdreb-5apjz-w73pk-3y3jo-3w6qj-2lrsc-6d2bq-nae" => ArrayBuffer [],
          "pbken-vny4r-j4a2m-zlvt2-kjj4i-pwehn-ftsa4-ne4xu-yz72s-fk6nz-eqe" => ArrayBuffer [],
          "xgysg-f6alc-ft2ai-gseic-u3ohh-cvvkf-5pvjh-spcbk-gvkla-bwswo-jae" => ArrayBuffer [],
          "ykydc-iog7g-744rt-mzbay-jnwat-e5bx5-invpc-f6d22-leoix-tide2-6qe" => ArrayBuffer [],
          "geihd-pwhjg-q3tno-beo64-ormih-pkjah-rrdlu-quwdk-nas5k-lmzoo-pae" => ArrayBuffer [],
          "ojfqu-qooyf-umyhe-bryn4-x6dcf-qv7ax-vnr5r-22ioq-jycjr-7le7t-uae" => ArrayBuffer [],
          "gsrhr-kwp6h-y6ibc-yftud-fzi66-vg5df-subl3-wiren-uzza6-rb5fc-dae" => ArrayBuffer [],
          "jjrbu-lwq3g-6z32f-54avq-c6jcp-sxp3o-kn4sf-hiiy4-jkuiy-252or-4ae" => ArrayBuffer [],
          "anudy-m6vfi-lphxb-sazpy-la4ti-2hriw-c67ny-butfn-axcel-otvuh-oqe" => ArrayBuffer [],
          "7o4d4-a6vmb-6bhh5-7ajyh-b5ejo-5bryc-gepsl-bthwu-65lee-52ebc-jqe" => ArrayBuffer [],
          "n4d4s-hgx3a-nwox5-tmfqw-q2gu6-mlzhy-deyzq-zu6r7-wryv2-napyl-qae" => ArrayBuffer [],
          "trupz-4o3zm-6itr3-6fjf3-ipbci-r2scy-pvycg-xlh4x-vtokf-avpr6-oqe" => ArrayBuffer [],
          "ggo52-qw45f-gqsnk-kc5i5-dag7l-7qkr4-2sy44-wxvr4-gohy7-ep56u-2ae" => ArrayBuffer [],
          "ufrjv-g66xi-c2bye-vujv7-cjih6-6jimn-ih2mx-4aev6-rzhu2-4c5xn-7ae" => ArrayBuffer [],
          "vsuqg-6hald-hxxxi-bxr2s-e5af5-p5lsr-2sutj-pip7r-co24u-2he35-hqe" => ArrayBuffer [],
          "as7de-zpig4-4hbwa-gnwlr-yqk4x-wxrme-n47bg-ngzcn-ekzyt-xuv3h-sae" => ArrayBuffer [],
          "eweqa-s7ilr-pmqbi-7gx46-hsiv4-pn3hq-zk6zi-gwktg-rn2mb-piahs-cqe" => ArrayBuffer [],
          "qccxj-nhnre-k2hq2-zxdqw-3kjpf-rbnn6-6ngt6-meoqb-c5ypx-jltjs-mqe" => ArrayBuffer [],
          "chm6s-bxqgk-jv6em-fbfrr-o54oi-idorx-rdpj7-asc5a-wmujl-awa77-2qe" => ArrayBuffer [],
          "5jo56-bxsxy-ocmas-lzhqq-hvtc3-7iwps-76qyk-abz3u-rn3xr-ya23r-4qe" => ArrayBuffer [],
          "s2p3k-c7zfo-3ogmz-esx75-id6pg-6xv72-kifmd-gp46u-ay6vt-d7i5d-5ae" => ArrayBuffer [],
          "felsm-ix5rz-avdrd-wfwnu-w2zw4-cgtnj-e3qpu-ulcsq-icq5y-jwwhn-jqe" => ArrayBuffer [],
        },
        "subnetId": "tdb26-jop6k-aogll-7ltgs-eruif-6kk7m-qpktf-gdiqx-mxtrf-vb5e6-eqe",
      }
    `);
  });

  it('should return the node keys from a local application subnet certificate', async () => {
    const { localApplication } = goldenCertificates;
    jest.useFakeTimers();
    jest.setSystemTime(new Date(Date.parse('2023-09-27T20:14:59.406Z')));
    const cert = await Cert.Certificate.create({
      certificate: fromHex(localApplication),
      canisterId: Principal.fromText('ryjl3-tyaaa-aaaaa-aaaba-cai'),
      rootKey: fromHex(IC_ROOT_KEY),
    });

    const nodeKeys = fetchNodeKeys(fromHex(localApplication), fromHex(IC_ROOT_KEY));
    expect(nodeKeys).toMatchInlineSnapshot(`
      Object {
        "nodeKeys": Map {
          "ego73-sreyv-vpdjs-gxxxh-jormr-swyro-toj4x-obghz-sbk32-duwid-dae" => ArrayBuffer [],
          "tm3pc-2bjsx-hhv3v-fsrt7-wotdj-nbu3t-ewloq-uporp-tacou-lupdn-oae" => ArrayBuffer [],
          "7pwmx-4zsiq-saplf-kl2sd-4yvr3-la2yi-artrs-m7voc-htak4-fii5y-sqe" => ArrayBuffer [],
          "gj6gc-mbslq-bt63y-72b7h-xs2xw-6vyuj-frvp3-tx375-dsqx5-wem6o-vqe" => ArrayBuffer [],
          "6hkcx-vz4jv-4n33r-ywdvs-sefaa-tb2on-rac6s-4csut-iyahu-zmct2-5qe" => ArrayBuffer [],
          "4j5xx-bj63k-iky3j-xrlt4-pel7s-t6wdq-hgqwz-c6xhn-llihg-wxska-rqe" => ArrayBuffer [],
          "tg4ec-b2g4p-h42kd-k7zvb-6rls2-i2q7l-gtr4h-ymr6v-rrez4-w6fao-oqe" => ArrayBuffer [],
          "swzzz-nct4o-kgh2s-fezeh-luamk-chexm-jsk4r-ks2qa-au63y-jtc7r-pae" => ArrayBuffer [],
          "f3zwq-g3ap2-42acw-twrar-6wire-5uhtr-qyu2e-v7vl7-43e3b-kdz7g-yae" => ArrayBuffer [],
          "lj3ve-ztk3f-wbkmj-garra-gm3kk-f2kas-zq6cw-6url4-ekmls-5vlm5-hae" => ArrayBuffer [],
          "j6uir-h4bk3-chdqr-hxnkr-3jp7o-yb3el-skdsd-7oejj-eubk5-5onvy-zae" => ArrayBuffer [],
          "6hvx2-ymemx-tmykh-vxyic-bgfhv-2lcmt-3oy4x-rysuf-rnerz-vqokw-sqe" => ArrayBuffer [],
          "6oooh-jum6y-focwn-kx5ba-omunf-jksiz-25lqk-xvcvb-7afff-3ceei-nqe" => ArrayBuffer [],
          "5mpdi-v4qj2-64are-tbe6r-6335g-6tksh-c7uzq-w3xyz-o4p5g-rwnll-vqe" => ArrayBuffer [],
          "3xpep-l47ad-vhwcb-gvikf-vpkdj-dbwky-jt5wc-odcdy-b5r4k-fiqbg-7qe" => ArrayBuffer [],
          "3rj6n-nnhqn-nad5q-y262v-fuhk4-myqv2-6qzld-ouk7q-fbsuo-l2fi3-6ae" => ArrayBuffer [],
          "p3g3j-vvhxl-luedm-woh3j-sllez-jkbzz-274bf-hyuoc-kyo5t-kwziw-eae" => ArrayBuffer [],
          "y5xp4-nnr33-qeeeg-55unp-xr7f2-mkjfv-7qwe3-zxd7k-lmqd2-mftya-7ae" => ArrayBuffer [],
          "tetdc-mvyld-p3miw-jdreb-5apjz-w73pk-3y3jo-3w6qj-2lrsc-6d2bq-nae" => ArrayBuffer [],
          "pbken-vny4r-j4a2m-zlvt2-kjj4i-pwehn-ftsa4-ne4xu-yz72s-fk6nz-eqe" => ArrayBuffer [],
          "xgysg-f6alc-ft2ai-gseic-u3ohh-cvvkf-5pvjh-spcbk-gvkla-bwswo-jae" => ArrayBuffer [],
          "ykydc-iog7g-744rt-mzbay-jnwat-e5bx5-invpc-f6d22-leoix-tide2-6qe" => ArrayBuffer [],
          "geihd-pwhjg-q3tno-beo64-ormih-pkjah-rrdlu-quwdk-nas5k-lmzoo-pae" => ArrayBuffer [],
          "ojfqu-qooyf-umyhe-bryn4-x6dcf-qv7ax-vnr5r-22ioq-jycjr-7le7t-uae" => ArrayBuffer [],
          "gsrhr-kwp6h-y6ibc-yftud-fzi66-vg5df-subl3-wiren-uzza6-rb5fc-dae" => ArrayBuffer [],
          "jjrbu-lwq3g-6z32f-54avq-c6jcp-sxp3o-kn4sf-hiiy4-jkuiy-252or-4ae" => ArrayBuffer [],
          "anudy-m6vfi-lphxb-sazpy-la4ti-2hriw-c67ny-butfn-axcel-otvuh-oqe" => ArrayBuffer [],
          "7o4d4-a6vmb-6bhh5-7ajyh-b5ejo-5bryc-gepsl-bthwu-65lee-52ebc-jqe" => ArrayBuffer [],
          "n4d4s-hgx3a-nwox5-tmfqw-q2gu6-mlzhy-deyzq-zu6r7-wryv2-napyl-qae" => ArrayBuffer [],
          "trupz-4o3zm-6itr3-6fjf3-ipbci-r2scy-pvycg-xlh4x-vtokf-avpr6-oqe" => ArrayBuffer [],
          "ggo52-qw45f-gqsnk-kc5i5-dag7l-7qkr4-2sy44-wxvr4-gohy7-ep56u-2ae" => ArrayBuffer [],
          "ufrjv-g66xi-c2bye-vujv7-cjih6-6jimn-ih2mx-4aev6-rzhu2-4c5xn-7ae" => ArrayBuffer [],
          "vsuqg-6hald-hxxxi-bxr2s-e5af5-p5lsr-2sutj-pip7r-co24u-2he35-hqe" => ArrayBuffer [],
          "as7de-zpig4-4hbwa-gnwlr-yqk4x-wxrme-n47bg-ngzcn-ekzyt-xuv3h-sae" => ArrayBuffer [],
          "eweqa-s7ilr-pmqbi-7gx46-hsiv4-pn3hq-zk6zi-gwktg-rn2mb-piahs-cqe" => ArrayBuffer [],
          "qccxj-nhnre-k2hq2-zxdqw-3kjpf-rbnn6-6ngt6-meoqb-c5ypx-jltjs-mqe" => ArrayBuffer [],
          "chm6s-bxqgk-jv6em-fbfrr-o54oi-idorx-rdpj7-asc5a-wmujl-awa77-2qe" => ArrayBuffer [],
          "5jo56-bxsxy-ocmas-lzhqq-hvtc3-7iwps-76qyk-abz3u-rn3xr-ya23r-4qe" => ArrayBuffer [],
          "s2p3k-c7zfo-3ogmz-esx75-id6pg-6xv72-kifmd-gp46u-ay6vt-d7i5d-5ae" => ArrayBuffer [],
          "felsm-ix5rz-avdrd-wfwnu-w2zw4-cgtnj-e3qpu-ulcsq-icq5y-jwwhn-jqe" => ArrayBuffer [],
        },
        "subnetId": "tdb26-jop6k-aogll-7ltgs-eruif-6kk7m-qpktf-gdiqx-mxtrf-vb5e6-eqe",
      }
    `);
  });

  it('should return the node keys from a local system subnet certificate', async () => {
    const { localSystem } = goldenCertificates;
    jest.useFakeTimers();
    jest.setSystemTime(new Date(Date.parse('2023-09-27T20:15:03.406Z')));
    const cert = await Cert.Certificate.create({
      certificate: fromHex(localSystem),
      canisterId: Principal.fromText('ryjl3-tyaaa-aaaaa-aaaba-cai'),
      rootKey: fromHex(IC_ROOT_KEY),
    });

    const nodeKeys = fetchNodeKeys(fromHex(localSystem), fromHex(IC_ROOT_KEY));
    expect(nodeKeys).toMatchInlineSnapshot(`
      Object {
        "nodeKeys": Map {
          "ego73-sreyv-vpdjs-gxxxh-jormr-swyro-toj4x-obghz-sbk32-duwid-dae" => ArrayBuffer [],
          "tm3pc-2bjsx-hhv3v-fsrt7-wotdj-nbu3t-ewloq-uporp-tacou-lupdn-oae" => ArrayBuffer [],
          "7pwmx-4zsiq-saplf-kl2sd-4yvr3-la2yi-artrs-m7voc-htak4-fii5y-sqe" => ArrayBuffer [],
          "gj6gc-mbslq-bt63y-72b7h-xs2xw-6vyuj-frvp3-tx375-dsqx5-wem6o-vqe" => ArrayBuffer [],
          "6hkcx-vz4jv-4n33r-ywdvs-sefaa-tb2on-rac6s-4csut-iyahu-zmct2-5qe" => ArrayBuffer [],
          "4j5xx-bj63k-iky3j-xrlt4-pel7s-t6wdq-hgqwz-c6xhn-llihg-wxska-rqe" => ArrayBuffer [],
          "tg4ec-b2g4p-h42kd-k7zvb-6rls2-i2q7l-gtr4h-ymr6v-rrez4-w6fao-oqe" => ArrayBuffer [],
          "swzzz-nct4o-kgh2s-fezeh-luamk-chexm-jsk4r-ks2qa-au63y-jtc7r-pae" => ArrayBuffer [],
          "f3zwq-g3ap2-42acw-twrar-6wire-5uhtr-qyu2e-v7vl7-43e3b-kdz7g-yae" => ArrayBuffer [],
          "lj3ve-ztk3f-wbkmj-garra-gm3kk-f2kas-zq6cw-6url4-ekmls-5vlm5-hae" => ArrayBuffer [],
          "j6uir-h4bk3-chdqr-hxnkr-3jp7o-yb3el-skdsd-7oejj-eubk5-5onvy-zae" => ArrayBuffer [],
          "6hvx2-ymemx-tmykh-vxyic-bgfhv-2lcmt-3oy4x-rysuf-rnerz-vqokw-sqe" => ArrayBuffer [],
          "6oooh-jum6y-focwn-kx5ba-omunf-jksiz-25lqk-xvcvb-7afff-3ceei-nqe" => ArrayBuffer [],
          "5mpdi-v4qj2-64are-tbe6r-6335g-6tksh-c7uzq-w3xyz-o4p5g-rwnll-vqe" => ArrayBuffer [],
          "3xpep-l47ad-vhwcb-gvikf-vpkdj-dbwky-jt5wc-odcdy-b5r4k-fiqbg-7qe" => ArrayBuffer [],
          "3rj6n-nnhqn-nad5q-y262v-fuhk4-myqv2-6qzld-ouk7q-fbsuo-l2fi3-6ae" => ArrayBuffer [],
          "p3g3j-vvhxl-luedm-woh3j-sllez-jkbzz-274bf-hyuoc-kyo5t-kwziw-eae" => ArrayBuffer [],
          "y5xp4-nnr33-qeeeg-55unp-xr7f2-mkjfv-7qwe3-zxd7k-lmqd2-mftya-7ae" => ArrayBuffer [],
          "tetdc-mvyld-p3miw-jdreb-5apjz-w73pk-3y3jo-3w6qj-2lrsc-6d2bq-nae" => ArrayBuffer [],
          "pbken-vny4r-j4a2m-zlvt2-kjj4i-pwehn-ftsa4-ne4xu-yz72s-fk6nz-eqe" => ArrayBuffer [],
          "xgysg-f6alc-ft2ai-gseic-u3ohh-cvvkf-5pvjh-spcbk-gvkla-bwswo-jae" => ArrayBuffer [],
          "ykydc-iog7g-744rt-mzbay-jnwat-e5bx5-invpc-f6d22-leoix-tide2-6qe" => ArrayBuffer [],
          "geihd-pwhjg-q3tno-beo64-ormih-pkjah-rrdlu-quwdk-nas5k-lmzoo-pae" => ArrayBuffer [],
          "ojfqu-qooyf-umyhe-bryn4-x6dcf-qv7ax-vnr5r-22ioq-jycjr-7le7t-uae" => ArrayBuffer [],
          "gsrhr-kwp6h-y6ibc-yftud-fzi66-vg5df-subl3-wiren-uzza6-rb5fc-dae" => ArrayBuffer [],
          "jjrbu-lwq3g-6z32f-54avq-c6jcp-sxp3o-kn4sf-hiiy4-jkuiy-252or-4ae" => ArrayBuffer [],
          "anudy-m6vfi-lphxb-sazpy-la4ti-2hriw-c67ny-butfn-axcel-otvuh-oqe" => ArrayBuffer [],
          "7o4d4-a6vmb-6bhh5-7ajyh-b5ejo-5bryc-gepsl-bthwu-65lee-52ebc-jqe" => ArrayBuffer [],
          "n4d4s-hgx3a-nwox5-tmfqw-q2gu6-mlzhy-deyzq-zu6r7-wryv2-napyl-qae" => ArrayBuffer [],
          "trupz-4o3zm-6itr3-6fjf3-ipbci-r2scy-pvycg-xlh4x-vtokf-avpr6-oqe" => ArrayBuffer [],
          "ggo52-qw45f-gqsnk-kc5i5-dag7l-7qkr4-2sy44-wxvr4-gohy7-ep56u-2ae" => ArrayBuffer [],
          "ufrjv-g66xi-c2bye-vujv7-cjih6-6jimn-ih2mx-4aev6-rzhu2-4c5xn-7ae" => ArrayBuffer [],
          "vsuqg-6hald-hxxxi-bxr2s-e5af5-p5lsr-2sutj-pip7r-co24u-2he35-hqe" => ArrayBuffer [],
          "as7de-zpig4-4hbwa-gnwlr-yqk4x-wxrme-n47bg-ngzcn-ekzyt-xuv3h-sae" => ArrayBuffer [],
          "eweqa-s7ilr-pmqbi-7gx46-hsiv4-pn3hq-zk6zi-gwktg-rn2mb-piahs-cqe" => ArrayBuffer [],
          "qccxj-nhnre-k2hq2-zxdqw-3kjpf-rbnn6-6ngt6-meoqb-c5ypx-jltjs-mqe" => ArrayBuffer [],
          "chm6s-bxqgk-jv6em-fbfrr-o54oi-idorx-rdpj7-asc5a-wmujl-awa77-2qe" => ArrayBuffer [],
          "5jo56-bxsxy-ocmas-lzhqq-hvtc3-7iwps-76qyk-abz3u-rn3xr-ya23r-4qe" => ArrayBuffer [],
          "s2p3k-c7zfo-3ogmz-esx75-id6pg-6xv72-kifmd-gp46u-ay6vt-d7i5d-5ae" => ArrayBuffer [],
          "felsm-ix5rz-avdrd-wfwnu-w2zw4-cgtnj-e3qpu-ulcsq-icq5y-jwwhn-jqe" => ArrayBuffer [],
        },
        "subnetId": "tdb26-jop6k-aogll-7ltgs-eruif-6kk7m-qpktf-gdiqx-mxtrf-vb5e6-eqe",
      }
    `);
  });
});
