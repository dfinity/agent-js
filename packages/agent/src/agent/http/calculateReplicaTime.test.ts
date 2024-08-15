import { calculateReplicaTime } from './calculateReplicaTime';
const exampleMessage = `Specified ingress_expiry not within expected range: Minimum allowed expiry: 2024-08-13 22:49:30.148075776 UTC, Maximum allowed expiry: 2024-08-13 22:55:00.148075776 UTC, Provided expiry:        2021-01-01 00:04:00 UTC`;

test.only('calculateReplicaTime', () => {
  calculateReplicaTime(exampleMessage); //?
});
