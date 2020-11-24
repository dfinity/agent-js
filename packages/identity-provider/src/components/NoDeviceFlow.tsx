import React, { Props } from 'react';
import { useAuth } from 'src/hooks/use-auth';


export function NoDeviceFlow() {
  const auth = useAuth();

  return <h2>No Device Detected</h2>

}