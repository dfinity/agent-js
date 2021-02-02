import P "mo:base/Principal";

actor {
    /*
    `whoami` - Who Am I?
    This method simply returns the `caller` of that invocation of the method.
    Use Cases:
    * Ensuring the canister methods can identify you how you want (perhaps using an opaque credential) before proceeding with other state mutations.
    * Testing
    */
    public shared query ({ caller }) func whoami() : async (Principal) {
        caller
    };
};
