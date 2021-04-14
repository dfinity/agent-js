import {
    HttpAgentRequest,
    Identity, Principal,
} from '@dfinity/agent';

export class LedgerIdentity implements Identity {
    getPrincipal(): Principal {
        throw new Error('Method not implemented.');
    }
    transformRequest(request: HttpAgentRequest): Promise<unknown> {
        throw new Error('Method not implemented.');
    }

}
