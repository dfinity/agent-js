import './App.css';
/* eslint-disable no-console */
import Candid from './Candid';
import * as zod from 'zod';

// Example schema
const exampleSchema = zod.object({
  name: zod.string().min(1, 'Name is required'),
  age: zod.number().min(18, 'You must be at least 18 years old'),
  email: zod.string().email('Invalid email address'),
});

function App() {
  return (
    <div className="App">
      <Candid />
      {/* <RecursiveForm /> */}
      {/* <MyForm schema={exampleSchema} /> */}
      {/* <Candid methods={methods} actor={actor} /> */}
    </div>
  );
}

export default App;
