import Result "mo:base/Result";
actor Self {

  type complexArg = {
    text : ?Text;
    number : ?Int;
    bool : ?Bool;
    variant : ?{
      #a : Text;
      #b : Int;
    };
    array : ?[Text];
  };

  public func kitchenSink(arg : complexArg) : async Result.Result<Bool, Text> {
    #ok(true);
  };

  public query func principal(arg : Principal) : async Principal {
    arg;
  };

  public query func text(arg : Text) : async Text {
    arg;
  };

  public query func int(arg : Int) : async Int {
    arg;
  };

  public query func nat(arg : Nat) : async Nat {
    arg;
  };

  public query func bool(arg : Bool) : async Bool {
    arg;
  };

  public shared query ({ caller }) func whoami() : async Principal {
    caller;
  };
};
