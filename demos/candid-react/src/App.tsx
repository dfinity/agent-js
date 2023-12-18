import './App.css';
/* eslint-disable no-console */
import { Actor } from '@dfinity/agent';
import { IDL } from '@dfinity/candid';
import { createActor } from './small';
import Candid from './Candid';
import Candid2 from './Candid2';

function App() {
  return (
    <div className="App">
      <Candid2 />
      {/* <Candid methods={methods} actor={actor} /> */}
    </div>
  );
}

export default App;
