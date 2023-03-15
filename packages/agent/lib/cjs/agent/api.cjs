'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.ReplicaRejectCode = void 0;
/**
 * Codes used by the replica for rejecting a message.
 * See {@link https://sdk.dfinity.org/docs/interface-spec/#reject-codes | the interface spec}.
 */
var ReplicaRejectCode;
(function (ReplicaRejectCode) {
  ReplicaRejectCode[(ReplicaRejectCode['SysFatal'] = 1)] = 'SysFatal';
  ReplicaRejectCode[(ReplicaRejectCode['SysTransient'] = 2)] = 'SysTransient';
  ReplicaRejectCode[(ReplicaRejectCode['DestinationInvalid'] = 3)] = 'DestinationInvalid';
  ReplicaRejectCode[(ReplicaRejectCode['CanisterReject'] = 4)] = 'CanisterReject';
  ReplicaRejectCode[(ReplicaRejectCode['CanisterError'] = 5)] = 'CanisterError';
})((ReplicaRejectCode = exports.ReplicaRejectCode || (exports.ReplicaRejectCode = {})));
//# sourceMappingURL=api.js.map
