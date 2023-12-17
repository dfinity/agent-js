"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable no-console */
var agent_1 = require("@dfinity/agent");
var large_1 = require("./large");
var actor = (0, large_1.createActor)('xeka7-ryaaa-aaaal-qb57a-cai', {
    agentOptions: {
        host: 'https://ic0.app',
    },
});
var methods = agent_1.Actor.interfaceOf(actor)._fields;
for (var _i = 0, methods_1 = methods; _i < methods_1.length; _i++) {
    var _a = methods_1[_i], method = _a[0], types = _a[1];
    console.log({ method: method, types: types });
    var ty = types.argTypes.map(function (type) {
        console.log(type);
        return type.extractFields();
    });
    console.log(ty);
}
//# sourceMappingURL=index.js.map