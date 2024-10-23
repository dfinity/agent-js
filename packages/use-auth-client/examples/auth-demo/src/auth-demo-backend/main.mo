import Principal "mo:base/Principal";
actor {
  public query func greet(name : Text) : async Text {
    return "Hello, " # name # "!";
  };
  public shared ({caller}) func whoami() : async Principal {
    return caller;
  };
};
