import React, { Props } from 'react';
import { useAuth } from 'src/hooks/use-auth';

export function NoRootFlow() {
  const auth = useAuth();

  return <h2>No Root Delegation Detected</h2>;
}
