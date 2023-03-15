'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
/**
 * This file is generated from the candid for asset management.
 */
/* tslint:disable */
// @ts-ignore
exports.default = ({ IDL }) => {
  return IDL.Service({
    retrieve: IDL.Func([IDL.Text], [IDL.Vec(IDL.Nat8)], ['query']),
    store: IDL.Func([IDL.Text, IDL.Vec(IDL.Nat8)], [], []),
  });
};
//# sourceMappingURL=asset_idl.js.map
