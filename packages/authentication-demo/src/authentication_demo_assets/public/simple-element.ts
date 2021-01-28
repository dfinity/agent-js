import { authenticator } from "@dfinity/authentication";

export default class FooElement extends HTMLElement {
    authenticator: typeof authenticator
    constructor(){ 
        super();
        this.authenticator = authenticator;
    }
}