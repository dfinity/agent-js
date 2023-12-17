/* eslint-disable no-console */
import { Actor } from '@dfinity/agent';
import { IDL } from '@dfinity/candid';
import { createActor } from './large';
import { Type } from '@dfinity/candid/lib/cjs/idl';

const actor = createActor('xeka7-ryaaa-aaaal-qb57a-cai', {
  agentOptions: {
    host: 'https://ic0.app',
  },
});

const methods: [string, IDL.FuncClass][] = Actor.interfaceOf(
  actor as Actor,
)._fields;

for (const [method, types] of methods) {
  console.log({ method, types });
  const ty = types.argTypes.map((type: Type) => {
    console.log(type);
    return type.extractFields();
  });

  console.log(ty);
}
