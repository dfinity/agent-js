import { Actor } from '@dfinity/agent';
import { createActor } from '../declarations/simple';
import Form from './Form';

export const actor = createActor('bkyz2-fmaaa-aaaaa-qaaaq-cai', {
  agentOptions: {
    host: 'http://localhost:4943',
    verifyQuerySignatures: false,
  },
});

const fields = Actor.interfaceOf(actor as Actor).extractFields();

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
      {fields.map(({ functionName, fields }) => {
        return <Form key={functionName} fields={fields} functionName={functionName} />;
      })}
    </div>
  );
};

export default Candid;
