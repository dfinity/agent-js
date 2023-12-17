"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.init = exports.idlFactory = void 0;
var idlFactory = function (_a) {
    var IDL = _a.IDL;
    var Value = IDL.Rec();
    Value.fill(IDL.Variant({
        Int: IDL.Int,
        Map: IDL.Vec(IDL.Tuple(IDL.Text, Value)),
        Nat: IDL.Nat,
        Nat64: IDL.Nat64,
        Blob: IDL.Vec(IDL.Nat8),
        Text: IDL.Text,
        Array: IDL.Vec(Value),
    }));
    var CreateAppArgs = IDL.Record({
        metadata: IDL.Vec(IDL.Tuple(IDL.Text, Value)),
        name: IDL.Text,
        description: IDL.Text,
    });
    var ReleaseView = IDL.Record({
        features: IDL.Text,
        date: IDL.Nat64,
        name: IDL.Text,
        size: IDL.Nat64,
        version: IDL.Text,
        deprecated: IDL.Bool,
    });
    var AppView = IDL.Record({
        id: IDL.Text,
        updated_at: IDL.Nat64,
        metadata: IDL.Vec(IDL.Tuple(IDL.Text, Value)),
        name: IDL.Text,
        description: IDL.Text,
        created_at: IDL.Nat64,
        created_by: IDL.Text,
        latest_release: IDL.Opt(ReleaseView),
        install_count: IDL.Nat64,
    });
    return IDL.Service({
        create_app: IDL.Func([CreateAppArgs], [AppView], []),
    });
};
exports.idlFactory = idlFactory;
var init = function () {
    return [];
};
exports.init = init;
//# sourceMappingURL=b3_system.did.js.map