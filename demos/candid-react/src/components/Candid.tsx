import { Actor } from '@dfinity/agent';
import { createActor } from '../declarations/simple';
import Form from './Form';

export const actor = createActor('bkyz2-fmaaa-aaaaa-qaaaq-cai', {
  agentOptions: {
    host: 'https://ic0.app',
    // 'http://localhost:4943',
    verifyQuerySignatures: false,
  },
});

export const actorInterface = Actor.interfaceOf(actor);

const field = actorInterface.extractField();

console.log('field', field);

interface CandidProps {}

const Candid: React.FC<CandidProps> = () => {
  return (
    <div className="max-w-3xl mx-auto">
      {field.fields.map(field => (
        <Form {...field} key={field.label} />
      ))}
    </div>
  );
};

export default Candid;
