import './App.css';
/* eslint-disable no-console */
import { Actor } from '@dfinity/agent';
import { IDL } from '@dfinity/candid';
import { createActor } from './small';
import Candid from './Candid';

const actor = createActor('xeka7-ryaaa-aaaal-qb57a-cai', {
  agentOptions: {
    host: 'https://ic0.app',
  },
});

const methods: [string, IDL.FuncClass][] = Actor.interfaceOf(actor as Actor)._fields;

function App() {
  return (
    <div className="App">
      <Candid methods={methods} />
    </div>
  );
}

export default App;
