import { getManagementCanister } from "@dfinity/agent";

test("createCanister", async () => {
  // Make sure this doesn't fail.
  await getManagementCanister({}).create_canister();
});
