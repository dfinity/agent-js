import { SignIdentity, AnonymousIdentity, Identity } from "@dfinity/agent";
import { BootstrapIdentityChangedEventType, IdentityDescriptor } from "./events";

export default class AuthenticationSubjectPublicKeyElement extends HTMLElement {
identity: IdentityDescriptor|null = null;
constructor() {
    super();
}
render() {
    this.innerHTML = this.getAttribute('publicKey') || this.getAttribute('initialPublicKey') || this.getAttribute('placeholder') || '';
}
connectedCallback() {
    console.log('info', 'AuthenticationSubjectPublicKeyElement connectedCallback')
    this.render();
    this.ownerDocument.addEventListener(BootstrapIdentityChangedEventType, e => this.onIdentityChangedEvent(e), true);

    const bootstrapIdentityChannel = new MessageChannel();
    bootstrapIdentityChannel.port2.onmessage = (event) => {
    console.log('bootstrapIdentityChannel.port2.onmessage', event);
    const data = event && event.data;
    const identity = data && data.identity;
    if ( !identity) {
        console.warn(`Cannot determine identity from bootstrapIdentityChannel message`);
        return;
    }
    if (this.identity) {
        console.warn('got identity from BootstrapIdentityRequestedEvent, but there is already an identity! skip')
    } else {
        this.useIdentity(identity)
    }
    }
    // const event = BootstrapIdentityRequestedEvent({ sender: bootstrapIdentityChannel.port1 })
    // console.debug('AuthenticationSubjectPublicKeyElement dispatching BootstrapIdentityRequestedEvent', event)
    this.ownerDocument.dispatchEvent(new CustomEvent('BenEvent', {
    bubbles: true,
    detail: {
        reason: 'testing dispatch from ownerDocument'
    }
    }))
    this.ownerDocument.dispatchEvent(new CustomEvent('BootstrapIdentityRequestedEvent', {
    bubbles: true,
    detail: {
        reason: 'testing dispatch from ownerDocument BootstrapIdentityRequestedEvent',
        sender: bootstrapIdentityChannel.port1
    }
    }))
}
onBootstrapIdentityMessageEvent(event: MessageEvent) {
    console.log('AuthenticationSubjectPublicKeyElement.onBootstrapIdentityMessageEvent', event);
    const data = event && event.data;
    const identity = data && data.identity
    if (identity) this.useIdentity(identity);
}
onIdentityChangedEvent(event: Event|CustomEvent) {
    const identity = ('detail' in event) && event.detail;
    if (identity) {
        this.useIdentity(identity)
    }
}
useIdentity(identity: IdentityDescriptor) {
    console.debug('useIdentity', identity)
    this.identity = identity;
    switch (identity.type) {
        case "PublicKeyIdentity":
            this.setAttribute('publicKey', identity.publicKey)
            break;
        case "AnonymousIdentity":
            break;
        default:
            let x: never = identity;       
    }
    this.render();
}
}
