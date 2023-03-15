'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.ProxyAgent = exports.ProxyStubAgent = exports.ProxyMessageKind = void 0;
const principal_1 = require('@dfinity/principal');
var ProxyMessageKind;
(function (ProxyMessageKind) {
  ProxyMessageKind['Error'] = 'err';
  ProxyMessageKind['GetPrincipal'] = 'gp';
  ProxyMessageKind['GetPrincipalResponse'] = 'gpr';
  ProxyMessageKind['Query'] = 'q';
  ProxyMessageKind['QueryResponse'] = 'qr';
  ProxyMessageKind['Call'] = 'c';
  ProxyMessageKind['CallResponse'] = 'cr';
  ProxyMessageKind['ReadState'] = 'rs';
  ProxyMessageKind['ReadStateResponse'] = 'rsr';
  ProxyMessageKind['Status'] = 's';
  ProxyMessageKind['StatusResponse'] = 'sr';
})((ProxyMessageKind = exports.ProxyMessageKind || (exports.ProxyMessageKind = {})));
// A Stub Agent that forwards calls to another Agent implementation.
class ProxyStubAgent {
  constructor(_frontend, _agent) {
    this._frontend = _frontend;
    this._agent = _agent;
  }
  onmessage(msg) {
    switch (msg.type) {
      case ProxyMessageKind.GetPrincipal:
        this._agent.getPrincipal().then(response => {
          this._frontend({
            id: msg.id,
            type: ProxyMessageKind.GetPrincipalResponse,
            response: response.toText(),
          });
        });
        break;
      case ProxyMessageKind.Query:
        this._agent.query(...msg.args).then(response => {
          this._frontend({
            id: msg.id,
            type: ProxyMessageKind.QueryResponse,
            response,
          });
        });
        break;
      case ProxyMessageKind.Call:
        this._agent.call(...msg.args).then(response => {
          this._frontend({
            id: msg.id,
            type: ProxyMessageKind.CallResponse,
            response,
          });
        });
        break;
      case ProxyMessageKind.ReadState:
        this._agent.readState(...msg.args).then(response => {
          this._frontend({
            id: msg.id,
            type: ProxyMessageKind.ReadStateResponse,
            response,
          });
        });
        break;
      case ProxyMessageKind.Status:
        this._agent.status().then(response => {
          this._frontend({
            id: msg.id,
            type: ProxyMessageKind.StatusResponse,
            response,
          });
        });
        break;
      default:
        throw new Error(`Invalid message received: ${JSON.stringify(msg)}`);
    }
  }
}
exports.ProxyStubAgent = ProxyStubAgent;
// An Agent that forwards calls to a backend. The calls are serialized
class ProxyAgent {
  constructor(_backend) {
    this._backend = _backend;
    this._nextId = 0;
    this._pendingCalls = new Map();
    this.rootKey = null;
  }
  onmessage(msg) {
    const id = msg.id;
    const maybePromise = this._pendingCalls.get(id);
    if (!maybePromise) {
      throw new Error('A proxy get the same message twice...');
    }
    this._pendingCalls.delete(id);
    const [resolve, reject] = maybePromise;
    switch (msg.type) {
      case ProxyMessageKind.Error:
        return reject(msg.error);
      case ProxyMessageKind.GetPrincipalResponse:
      case ProxyMessageKind.CallResponse:
      case ProxyMessageKind.QueryResponse:
      case ProxyMessageKind.ReadStateResponse:
      case ProxyMessageKind.StatusResponse:
        return resolve(msg.response);
      default:
        throw new Error(`Invalid message being sent to ProxyAgent: ${JSON.stringify(msg)}`);
    }
  }
  async getPrincipal() {
    return this._sendAndWait({
      id: this._nextId++,
      type: ProxyMessageKind.GetPrincipal,
    }).then(principal => {
      if (typeof principal !== 'string') {
        throw new Error('Invalid principal received.');
      }
      return principal_1.Principal.fromText(principal);
    });
  }
  readState(canisterId, fields) {
    return this._sendAndWait({
      id: this._nextId++,
      type: ProxyMessageKind.ReadState,
      args: [canisterId.toString(), fields],
    });
  }
  call(canisterId, fields) {
    return this._sendAndWait({
      id: this._nextId++,
      type: ProxyMessageKind.Call,
      args: [canisterId.toString(), fields],
    });
  }
  status() {
    return this._sendAndWait({
      id: this._nextId++,
      type: ProxyMessageKind.Status,
    });
  }
  query(canisterId, fields) {
    return this._sendAndWait({
      id: this._nextId++,
      type: ProxyMessageKind.Query,
      args: [canisterId.toString(), fields],
    });
  }
  async _sendAndWait(msg) {
    return new Promise((resolve, reject) => {
      this._pendingCalls.set(msg.id, [resolve, reject]);
      this._backend(msg);
    });
  }
  async fetchRootKey() {
    // Hex-encoded version of the replica root key
    const rootKey = (await this.status()).root_key;
    this.rootKey = rootKey;
    return rootKey;
  }
}
exports.ProxyAgent = ProxyAgent;
//# sourceMappingURL=proxy.js.map
