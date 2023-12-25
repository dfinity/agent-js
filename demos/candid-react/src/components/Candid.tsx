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
    <div
      style={{
        maxWidth: 700,
        width: '100%',
        margin: 'auto',
      }}
    >
      {field.fields.map(field => (
        <Form
          field={field}
          key={field.label}
          functionName={field.label}
          defaultValues={field.defaultValue}
        />
      ))}
    </div>
  );
};

export default Candid;
