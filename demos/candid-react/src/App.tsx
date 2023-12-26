import { Actor } from '@dfinity/agent';
import { createActor } from './declarations/candid';
import Form from './components/Form';

export const actor = createActor('bkyz2-fmaaa-aaaaa-qaaaq-cai', {
  agentOptions: {
    host: 'https://ic0.app',
  },
});

export const actorInterface = Actor.interfaceOf(actor);

const field = actorInterface.extractField();

console.log('field', field);

interface CandidProps {}

const App: React.FC<CandidProps> = () => {
  return (
    <div className="p-2 max-w-3xl mx-auto">
      {field.fields.map(field => (
        <Form {...field} key={field.label} />
      ))}
    </div>
  );
};

export default App;
