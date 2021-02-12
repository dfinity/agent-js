import { Ed25519KeyIdentity } from '../identity/ed25519';
import { IdentitiesIterable } from './IdentitiesIterable';
import { createIdentityDescriptor } from '@dfinity/agent';
import { hexEncodeUintArray } from '../idp-protocol/bytes';
import { IdentityRequestedEvent, IdentityRequestedEventIdentifier } from '../id-dom-events';

// const sampleAuthenticationResponse = {
//   url:
//     'http://localhost:8000/?canisterId=rrkah-fqaaa-aaaaa-aaaaq-cai&access_token=7b2264656c65676174696f6e73223a5b7b2264656c65676174696f6e223a7b2265787069726174696f6e223a2231363632353838623562613037363430222c227075626b6579223a2233303261333030353036303332623635373030333231303032313133383333363732303933623538343236336334366635646364633436353732333237346634393064666433366437356631313261373538333563366632222c2274617267657473223a5b223030303030303030303030303030303030313031225d7d2c227369676e6174757265223a226439643966376133363937333639363736653631373437353732363535383437333034353032323130303964613536643061383861353561363633346234656362393161356465383937376463336234623561376331313362356435356335643039633037326330303730323230333032366634326634343466333962303631303739626339363266373531313234306534326666396334353764353939346663316265303763393632303634313730363336633639363536653734356636343631373436313566366137333666366537386533376232323633363836313663366336353665363736353232336132323437366436633661346335383461366336333538353636633633333335313734353935383536333036313433333136623561353737383663356133323436333036313537333937353333373933353735333336613438333735383530366237353732366337353632343635353639343134373433376136623631353036623639343434393464363233313439346433363536373137353639363235323662323232633232363336633639363536653734343537383734363536653733363936663665373332323361376237643263323236383631373336383431366336373666373236393734363836643232336132323533343834313264333233353336323232633232366637323639363736393665323233613232363837343734373037333361326632663639363436353665373436393734373932643730373236663736363936343635373232653733363436623264373436353733373432653634363636393665363937343739326536653635373437373666373236623232326332323734373937303635323233613232373736353632363137353734363836653265363736353734323237643732363137353734363836353665373436393633363137343666373235663634363137343631353832353936316335333830366532616135343837313462656337376162303962376430643261613833373731306137393435613165373239343962633361303765336430313030303030303130227d5d2c227075626c69634b6579223a22333035653330306330363061326230363031303430313833623834333031303130333465303061353031303230333236323030313231353832303036393733303865343139643261303963666461306137313939393739353630336232356537666537383238326366383961646533353563323064336335353932323538323066363736336338303064613363333631336164383830323639663236343633646630376666376362323162356330393534393061356363653362363563346366227d&expires_in=10000000&token_type=bearer&scope=rwlgt-iiaaa-aaaaa-aaaaa-cai',
//   rootIdentity: {
//     publicKey:
//       '302a300506032b65700321004e06222330d036bbd4cfff3c0e7b7c54c5ad3da927ac3caf91ab6c249c3b4f60',
//   },
// };

describe('IdentitiesIterable', () => {
  /**
   * Skipping this test on 2021-02-09 because it hangs on github actions.
   * It only hangs on github actions, preventing `npm test` from returning.
   * Debug via binary search of commenting out parts of code until the bug goes away.
   * If I had to guess, it might be related to IdentityRequestedEvent's use of MessageChannel,
   * which doesn't exist in node.js, so I tried to polyfill it from node worker_threads module
   * in ../../test-setup.js.
   * @todo unskip this test or replace it with an even more complete one that works
   */
  it.skip('has identities iterable', async () => {
    const el = document.createElement('div');
    const sampleIdentity = Ed25519KeyIdentity.generate(crypto.getRandomValues(new Uint8Array(32)));
    // This is similar to one @dfinity/bootstrap's IdentityActor does,
    // but this test doesn't rely on a running IdentityActor
    function handleOne(el: Element, event: Event | CustomEvent) {
      const detail = (event as CustomEvent)?.detail;
      const sender = (detail as ReturnType<typeof IdentityRequestedEvent>['detail'])?.sender;
      if (!sender) {
        return listenOne(el);
      }
      sender.postMessage({
        identity: createIdentityDescriptor(sampleIdentity),
      });
    }
    function listenOne(el: Element) {
      el.addEventListener(IdentityRequestedEventIdentifier, event => handleOne(el, event), {
        once: true,
      });
    }
    listenOne(el);
    const identitiesIterable = IdentitiesIterable(el);

    await new Promise(resolve => setTimeout(resolve, 1));
    const timeout = (ms: number) =>
      new Promise<void>(resolve => {
        setTimeout(() => resolve(undefined), ms);
      });
    const firstIdentityResult = await Promise.race([
      timeout(5000),
      identitiesIterable[Symbol.asyncIterator]().next(),
    ]);
    if (!firstIdentityResult) {
      throw new Error('no firstIdentityResult');
    }
    expect(firstIdentityResult.done).toEqual(false);
    const firstIdentityResultValue = firstIdentityResult.value;
    if (!(firstIdentityResultValue && firstIdentityResultValue?.type === 'PublicKeyIdentity')) {
      throw new Error('expected firstIdentityResultValue to be PublicKeyIdentity');
    }
    expect(firstIdentityResultValue.publicKey).toEqual(
      hexEncodeUintArray(sampleIdentity.getPublicKey().toDer()),
    );
    await identitiesIterable.return();
  });
});
