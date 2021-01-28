import P "mo:base/Principal";

actor {
    public shared query { caller } func whoami() : async (Principal) {
        (caller)
    };
};
