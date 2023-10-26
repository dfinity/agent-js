import { HttpAgent } from '@dfinity/agent';
import { createActor } from '../canisters/declarations/counter/index';
const counter = createActor('teog5-mqaaa-aaaab-qaija-cai', {
  agent: new HttpAgent(),
});
async function runTests() {
  await counter.inc();
  console.log(await counter.read());
  ``;
  await counter.reset();
}

async function main() {
  try {
    await runTests();
    await runTests();
  } catch (error) {
    console.error(error);
    // wait 10 seconds for the canister to become free
    new Promise(resolve => setTimeout(resolve, 10000)).then(runTests);
  }
}
main();
