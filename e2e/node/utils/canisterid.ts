import { Principal } from "@dfinity/principal"
import { execSync } from "child_process"

export const getCanisterId = (canisterName: string, network?: string): Principal => {
    const networkFlag = network ? ` --network ${network}` : ""
    return Principal.fromText(execSync(`dfx canister id ${canisterName}${networkFlag}`).toString().trim())
}
